import { defineWorkflow, joinSession } from "@github/copilot-sdk/extension";

const DEFAULT_MODELS = ["claude-opus-5.5", "gpt-6.1-sol", "gemini-4-argon"];

const FINDINGS_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["findings"],
    properties: {
        findings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "command", "observed", "expected"],
                properties: {
                    title: { type: "string" },
                    command: { type: "string" },
                    observed: { type: "string" },
                    expected: { type: "string" },
                },
            },
        },
    },
};

const VERDICT_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["reproduced", "observed", "reason"],
    properties: {
        reproduced: { type: "boolean" },
        observed: { type: "string" },
        reason: { type: "string" },
    },
};

const attackPrompt = (scope, intent, model) => `Break this change.

Scope: ${scope}
Intent (what the change is supposed to do): ${intent}

Prove each finding with a run against the real code, such as a failing test, a repro script, or command output that shows the wrong behavior. Put repro files under ./.scratch/interrogate-${model}/ and nowhere else. Report each finding with a short title, the exact command, the output it printed, and the output the intent requires. Leave out anything you did not run, including style, naming, structure, and risks that need a future change to matter. An empty findings list is a valid result.`;

const verifyPrompt = (scope, intent, finding, model) => `Another reviewer claims this change is broken. Check the claim independently. Do not fix anything.

Scope: ${scope}
Intent: ${intent}

Claimed failure: ${finding.title}
Their command: ${finding.command}
Output they say it printed: ${finding.observed}
Output the intent requires: ${finding.expected}

Run the command, or your own equivalent if it depends on files you don't have. Write only under ./.scratch/interrogate-verify-${model}/. Set reproduced to true only if your own run shows the failure and it breaks the intent. Put what your run printed in observed, and one sentence of reasoning in reason.`;

const interrogate = defineWorkflow({
    meta: {
        name: "interrogate",
        description:
            "Adversarial review where a finding survives only when an adversary on a different model family reproduces it. " +
            "args: { scope: string, intent: string, models?: string[] } where scope is what to attack (for example 'the diff from origin/main'), " +
            "intent is what the change should do, and models (2 or more CLI model IDs) overrides the default Claude, GPT and Gemini trio.",
        phases: [
            { title: "Attack", detail: "One Adversary per model family" },
            { title: "Verify", detail: "Each finding rerun by a different model family" },
            { title: "Report" },
        ],
        argsSchema: {
            type: "object",
            required: ["scope", "intent"],
            properties: {
                scope: { type: "string" },
                intent: { type: "string" },
                models: { type: "array", items: { type: "string" } },
            },
        },
    },
    run: async (ctx) => {
        const { scope, intent } = ctx.args;
        if (!scope?.trim() || !intent?.trim()) {
            throw new Error("args.scope and args.intent must be non-empty strings");
        }
        const models = Array.isArray(ctx.args.models) && ctx.args.models.length >= 2 ? ctx.args.models : DEFAULT_MODELS;
        const verifierFor = (model) => models[(models.indexOf(model) + 1) % models.length];

        ctx.phase("Attack");
        const perModel = await ctx.pipeline(
            models,
            (_, model) =>
                ctx.agent(attackPrompt(scope, intent, model), {
                    agent: "Adversary",
                    model,
                    label: `attack:${model}`,
                    schema: FINDINGS_SCHEMA,
                }),
            async (attack, model) => {
                if (!attack) {
                    ctx.log(`${model}: no usable result`);
                    return { model, failed: true, checked: [] };
                }
                ctx.log(`${model}: ${attack.findings.length} candidate finding(s)`);
                const verifier = verifierFor(model);
                const checked = await ctx.parallel(
                    attack.findings.map((finding, i) => async () => ({
                        ...finding,
                        foundBy: model,
                        verifiedBy: verifier,
                        verdict: await ctx.agent(verifyPrompt(scope, intent, finding, verifier), {
                            agent: "Adversary",
                            model: verifier,
                            label: `verify:${model}:${i}`,
                            schema: VERDICT_SCHEMA,
                        }),
                    }))
                );
                return { model, failed: false, checked: checked.filter((c) => c !== null) };
            }
        );

        ctx.phase("Report");
        const confirmed = [];
        const dropped = [];
        for (const result of perModel.filter((r) => r !== null)) {
            for (const f of result.checked) {
                if (f.verdict?.reproduced === true) confirmed.push(f);
                else dropped.push({ ...f, dropReason: f.verdict ? f.verdict.reason : "verifier returned no result" });
            }
        }
        const failedAdversaries = perModel
            .map((r, i) => (r === null || r.failed ? models[i] : null))
            .filter((m) => m !== null);
        ctx.log(`${confirmed.length} confirmed, ${dropped.length} dropped`);
        return { scope, intent, models, confirmed, dropped, failedAdversaries };
    },
});

const obj = (properties) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
});
const str = { type: "string" };
const bool = { type: "boolean" };
const strList = { type: "array", items: str };

const REPRO_SCHEMA = obj({ command: str, output: str, whyItShowsTheBug: str });
const FAILS_SCHEMA = obj({ fails: bool, output: str, reason: str });
const HYPOTHESES_SCHEMA = obj({ hypotheses: { type: "array", items: obj({ claim: str, check: str }) } });
const CHECK_SCHEMA = obj({ supported: bool, evidence: str });
const ROOT_CAUSE_SCHEMA = obj({ rootCause: str, evidence: str, firstWrongPlace: str });
const FIX_SCHEMA = obj({ summary: str, filesChanged: strList });
const FIX_CHECK_SCHEMA = obj({ reproPasses: bool, reproOutput: str, testsPass: bool, testsOutput: str });
const PREMISE_SCHEMA = obj({ premise: str, test: str, holds: bool, revisedRootCause: str });
const REVIEW_SCHEMA = obj({ blockers: { type: "array", items: obj({ where: str, issue: str, evidence: str }) }, notes: strList });

const VERIFIER = "gpt-6.1-sol";
const REASONER = "claude-opus-5.5";

const bugFix = defineWorkflow({
    meta: {
        name: "bug-fix",
        description:
            "Evidence-gated bug fix: a repro must fail before any fix, an independent model must see it pass after, root cause comes from checked hypotheses, " +
            "fix rounds are capped with a premise check after two failures, and a cross-family Reviewer reads the result. " +
            "args: { bug: string, expected: string, testCommand?: string, maxRounds?: number, pauseBeforeFix?: boolean } where bug is the observed symptom, " +
            "expected is the correct behavior, and testCommand is the project's test command to run after each fix.",
        phases: [
            { title: "Reproduce", detail: "Repro must fail, confirmed by a different model" },
            { title: "Root cause", detail: "Hypotheses checked in parallel" },
            { title: "Fix", detail: "Capped rounds, each verified independently" },
            { title: "Review" },
        ],
        argsSchema: {
            type: "object",
            required: ["bug", "expected"],
            properties: {
                bug: str,
                expected: str,
                testCommand: str,
                maxRounds: { type: "integer" },
                pauseBeforeFix: bool,
            },
        },
    },
    run: async (ctx) => {
        const { bug, expected } = ctx.args;
        if (!bug?.trim() || !expected?.trim()) throw new Error("args.bug and args.expected must be non-empty strings");
        const testCommand = ctx.args.testCommand?.trim() || "";
        const maxRounds = Number.isInteger(ctx.args.maxRounds) && ctx.args.maxRounds > 0 ? ctx.args.maxRounds : 3;
        const brief = `Bug: ${bug}\nExpected behavior: ${expected}`;

        ctx.phase("Reproduce");
        let repro = null;
        let reproCheck = null;
        let feedback = "";
        for (let attempt = 1; attempt <= 2 && !reproCheck?.fails; attempt++) {
            repro = await ctx.agent(
                `${brief}\n\nWrite the smallest script, test or command that shows this bug in the current repository. Put new files under ./.scratch/bug-fix/ unless a real test file fits the project's conventions. Run it and confirm it fails for the stated reason. Do not fix the bug.${feedback}\n\nReturn the exact command to run, its output, and why that output shows the bug.`,
                { agent: "Tester", label: `repro:${attempt}`, schema: REPRO_SCHEMA }
            );
            if (!repro) continue;
            reproCheck = await ctx.agent(
                `${brief}\n\nRun this command exactly and report what happens. Do not change any files.\n\nCommand: ${repro.command}\n\nSet fails to true only if the output shows the bug described above, not an unrelated error such as a missing file or syntax error.`,
                { agent: "Adversary", model: VERIFIER, label: `repro-check:${attempt}`, schema: FAILS_SCHEMA }
            );
            if (reproCheck && !reproCheck.fails) {
                feedback = `\n\nA previous repro was rejected by an independent check: ${reproCheck.reason}`;
                ctx.log(`repro ${attempt} rejected: ${reproCheck.reason}`);
            }
        }
        if (!repro || !reproCheck?.fails) {
            return { status: "no-repro", bug, repro, reproCheck };
        }
        ctx.log(`repro confirmed by ${VERIFIER}: ${repro.command}`);

        ctx.phase("Root cause");
        const hyp = await ctx.agent(
            `${brief}\n\nFailing repro: ${repro.command}\nOutput:\n${repro.output}\n\nList 2 to 5 candidate root causes, seeded by the code and the recent git history of the affected lines. For each, give one read-only check (a command, or a specific file and line to read) that would confirm or rule it out.`,
            { agent: "Scout", model: REASONER, label: "hypotheses", schema: HYPOTHESES_SCHEMA }
        );
        const hypotheses = (hyp?.hypotheses ?? []).filter((h) => h.claim.trim().length > 10 && h.check.trim().length > 5);
        const checks = await ctx.parallel(
            hypotheses.map((h, i) => async () => ({
                ...h,
                result: await ctx.agent(
                    `${brief}\n\nHypothesis: ${h.claim}\nCheck: ${h.check}\n\nRun the check without modifying files. Set supported to true only if what you observed confirms the hypothesis. Quote the observation in evidence.`,
                    { agent: "Scout", label: `check:${i}`, schema: CHECK_SCHEMA }
                ),
            }))
        );
        const supported = checks.filter((c) => c?.result?.supported === true);
        ctx.log(`${supported.length} of ${hypotheses.length} hypotheses supported`);
        if (supported.length === 0) {
            return { status: "root-cause-unconfirmed", bug, repro, hypotheses: checks };
        }
        let rootCause = await ctx.agent(
            `${brief}\n\nThese hypotheses were confirmed by read-only checks:\n${supported.map((c) => `- ${c.claim}\n  evidence: ${c.result.evidence}`).join("\n")}\n\nState the root cause: the first place the system goes wrong, not where the symptom surfaces. Cite the evidence.`,
            { model: REASONER, label: "root-cause", schema: ROOT_CAUSE_SCHEMA }
        );
        if (!rootCause) return { status: "root-cause-unconfirmed", bug, repro, hypotheses: checks };

        if (ctx.args.pauseBeforeFix === true) await ctx.pause("before-fix");

        ctx.phase("Fix");
        const rounds = [];
        let fixed = false;
        for (let round = 1; round <= maxRounds && !fixed; round++) {
            const history = rounds.length
                ? `\n\nEarlier attempts failed. First undo any part of them that the current root cause doesn't justify:\n${rounds.map((r) => `- round ${r.round}: ${r.fix?.summary ?? "no result"}; check said: ${r.check?.reproOutput ?? "no result"}`).join("\n")}`
                : "";
            const fix = await ctx.agent(
                `${brief}\n\nRoot cause: ${rootCause.rootCause}\nFirst wrong place: ${rootCause.firstWrongPlace}\nEvidence: ${rootCause.evidence}\n\nMake the smallest change at the root cause that makes this repro pass: ${repro.command}${testCommand ? `\nThe project's tests must still pass: ${testCommand}` : ""}${history}\n\nDo not edit the repro. Do not commit or push.`,
                { agent: "Builder", label: `fix:${round}`, schema: FIX_SCHEMA }
            );
            const check = await ctx.agent(
                `Run these commands exactly and report the results. Do not change any files.\n\nRepro: ${repro.command}\nThe repro passes only if its output now shows this expected behavior: ${expected}\n\n${testCommand ? `Tests: ${testCommand}\nSet testsPass to true only if the test command exits successfully.` : "There is no test command. Set testsPass to true and testsOutput to \"not run\"."}`,
                { agent: "Adversary", model: VERIFIER, label: `fix-check:${round}`, schema: FIX_CHECK_SCHEMA }
            );
            fixed = check?.reproPasses === true && check?.testsPass === true;
            rounds.push({ round, fix, check, fixed });
            ctx.log(`round ${round}: ${fixed ? "verified" : "not verified"}`);

            if (!fixed && round === 2 && round < maxRounds) {
                const premise = await ctx.agent(
                    `${brief}\n\nTwo fixes based on this root cause both failed independent verification.\nRoot cause: ${rootCause.rootCause}\nAttempts:\n${rounds.map((r) => `- ${r.fix?.summary ?? "no result"} -> ${r.check?.reproOutput ?? "no result"}`).join("\n")}\n\nWrite down the premise both fixes shared. Test it with a read-only run against the code. If it does not hold, give the revised root cause; otherwise repeat the current one.`,
                    { model: REASONER, label: "premise", schema: PREMISE_SCHEMA }
                );
                if (premise && !premise.holds) {
                    ctx.log(`premise refuted: ${premise.premise}`);
                    rootCause = { ...rootCause, rootCause: premise.revisedRootCause, evidence: `${premise.test}` };
                }
                rounds[rounds.length - 1].premise = premise;
            }
        }

        if (!fixed) return { status: "stuck", bug, repro, rootCause, rounds };

        ctx.phase("Review");
        const review = await ctx.agent(
            `${brief}\n\nRoot cause: ${rootCause.rootCause}\n\nReview the uncommitted change (git diff) that fixes this. Report only blockers you verified in the code: wrong root cause, broken callers, unhandled edge cases, security problems. Put lesser points in notes.`,
            { agent: "Reviewer", model: VERIFIER, label: "review", schema: REVIEW_SCHEMA }
        );
        return { status: review?.blockers?.length ? "fixed-with-blockers" : "fixed", bug, repro, rootCause, rounds, review };
    },
});

await joinSession({ workflows: [interrogate, bugFix] });

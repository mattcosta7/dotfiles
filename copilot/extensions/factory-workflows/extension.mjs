import { defineWorkflow, joinSession } from "@github/copilot-sdk/extension";
import { arena } from "./arena.mjs";
import { feature } from "./feature.mjs";
import { MODELS, REVIEW_SCHEMA, bool, obj, runInterrogation, str, strList } from "./lib.mjs";
import { shipCheck } from "./ship-check.mjs";

const interrogate = defineWorkflow({
    meta: {
        name: "interrogate",
        description:
            "Adversarial review where a finding survives only when an adversary on a different model family reproduces it. " +
            "args: { scope: string, intent: string, models?: string[] } where scope is what to attack (for example 'the diff from origin/main'), " +
            "intent is what the change should do, and models (2 or more CLI model IDs) overrides the default Claude, GPT and Gemini trio.",
        phases: [
            { title: "Attack", detail: "One Adversary per model family" },
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
        const models = Array.isArray(ctx.args.models) && ctx.args.models.length >= 2 ? ctx.args.models : MODELS.adversaries;
        ctx.phase("Attack");
        const result = await runInterrogation(ctx, { scope, intent, models, tag: "i" });
        ctx.phase("Report");
        return { scope, intent, ...result };
    },
});

const REPRO_SCHEMA = obj({ command: str, output: str, whyItShowsTheBug: str });
const FAILS_SCHEMA = obj({ fails: bool, output: str, reason: str });
const HYPOTHESES_SCHEMA = obj({ hypotheses: { type: "array", items: obj({ claim: str, check: str }) } });
const CHECK_SCHEMA = obj({ supported: bool, evidence: str });
const ROOT_CAUSE_SCHEMA = obj({ rootCause: str, evidence: str, firstWrongPlace: str });
const FIX_SCHEMA = obj({ summary: str, filesChanged: strList });
const FIX_CHECK_SCHEMA = obj({ reproPasses: bool, reproOutput: str, testsPass: bool, testsOutput: str });
const PREMISE_SCHEMA = obj({ premise: str, test: str, holds: bool, revisedRootCause: str });

const VERIFIER = MODELS.verifier;
const REASONER = MODELS.reasoner;

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
        const usable = (r) => (r?.hypotheses ?? []).filter((h) => h.claim.trim().length > 10 && h.check.trim().length > 5);
        const hypothesisPrompt = `${brief}\n\nFailing repro: ${repro.command}\nOutput:\n${repro.output}\n\nRead the code under test and the recent git history of the affected lines. List 2 to 5 candidate root causes. For each, claim is one sentence naming the file and the mechanism, and check is one read-only command, or a specific file and line to read, that would confirm or rule it out. Neither field may be empty.`;
        let hypotheses = usable(
            await ctx.agent(hypothesisPrompt, { agent: "Scout", model: REASONER, label: "hypotheses", schema: HYPOTHESES_SCHEMA })
        );
        if (hypotheses.length === 0) {
            // Schema-valid but empty output repeats under the same agent, so retry once without it.
            ctx.log("hypotheses came back empty; retrying once");
            hypotheses = usable(
                await ctx.agent(hypothesisPrompt, { model: REASONER, label: "hypotheses-retry", schema: HYPOTHESES_SCHEMA })
            );
        }
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
                `${brief}\n\nRoot cause: ${rootCause.rootCause}\nFirst wrong place: ${rootCause.firstWrongPlace}\nEvidence: ${rootCause.evidence}\n\nMake the smallest change at the root cause that makes this repro pass: ${repro.command}${testCommand ? `\nThe project's tests must still pass: ${testCommand}` : ""}${history}\n\nDo not edit the repro or any existing test. If the fix seems to require changing an existing test, stop and say why in summary instead. Do not commit or push.`,
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

await joinSession({ workflows: [interrogate, bugFix, shipCheck, arena, feature] });

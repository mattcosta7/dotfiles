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

await joinSession({ workflows: [interrogate] });

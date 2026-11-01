import { execFile } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

export const MODELS = JSON.parse(readFileSync(new URL("../models.json", import.meta.url), "utf8"));

export const obj = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
export const str = { type: "string" };
export const bool = { type: "boolean" };
export const int = { type: "integer" };
export const strList = { type: "array", items: str };
export const oneOf = (...values) => ({ type: "string", enum: values });

export const REVIEW_SCHEMA = obj({
    blockers: { type: "array", items: obj({ where: str, issue: str, evidence: str }) },
    notes: strList,
});
export const CRITERIA_SCHEMA = obj({
    build: obj({ command: str, output: str, passed: bool }),
    tests: obj({ command: str, output: str, passed: bool }),
    criteria: { type: "array", items: obj({ text: str, status: oneOf("pass", "fail", "unverified"), command: str, output: str }) },
});

const FINDINGS_SCHEMA = obj({ findings: { type: "array", items: obj({ title: str, command: str, observed: str, expected: str }) } });
const VERDICT_SCHEMA = obj({ reproduced: bool, observed: str, reason: str });

/** Runs a fixed program with fixed args. Never pass model-written text here. */
export const sh = (cmd, args, cwd, timeout = 600_000) =>
    new Promise((resolve) =>
        execFile(cmd, args, { cwd, timeout, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) =>
            resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, out: `${stdout}${stderr}`.slice(-8000) })
        )
    );

/** Runs a command the user supplied in the workflow args, such as a test command. */
export const userCommand = (command, cwd) => sh("sh", ["-c", command], cwd, 1_800_000);

export const repoRoot = async (dir) => {
    const r = await sh("git", ["rev-parse", "--show-toplevel"], dir);
    if (r.code !== 0) throw new Error(`not a git repository: ${dir}`);
    return r.out.trim();
};

// Worktrees live inside the repo: agents may only touch the session's folder, so a sibling directory is denied.
export const worktreeDir = async (root, name) => {
    const common = (await sh("git", ["rev-parse", "--git-common-dir"], root)).out.trim();
    const exclude = join(isAbsolute(common) ? common : join(root, common), "info", "exclude");
    let current = "";
    try {
        current = readFileSync(exclude, "utf8");
    } catch {}
    if (!current.split("\n").includes("/.factory-worktrees/")) {
        mkdirSync(dirname(exclude), { recursive: true });
        appendFileSync(exclude, `${current && !current.endsWith("\n") ? "\n" : ""}/.factory-worktrees/\n`);
    }
    return join(root, ".factory-worktrees", name);
};

export const commitAll = async (dir, message) => {
    await sh("git", ["add", "-A"], dir);
    const r = await sh("git", ["-c", "user.name=factory", "-c", "user.email=factory@localhost", "commit", "-q", "--no-verify", "-m", message], dir);
    return r.code === 0;
};

const attackPrompt = (scope, intent, scratch) => `Break this change.

Scope: ${scope}
Intent (what the change is supposed to do): ${intent}

Prove each finding with a run against the real code, such as a failing test, a repro script, or command output that shows the wrong behavior. Put repro files under ${scratch}/ and nowhere else. Report each finding with a short title, the exact command, the output it printed, and the output the intent requires. Leave out anything you did not run, including style, naming, structure, and risks that need a future change to matter. An empty findings list is a valid result.`;

const verifyPrompt = (scope, intent, finding, scratch) => `Another reviewer claims this change is broken. Check the claim independently. Do not fix anything.

Scope: ${scope}
Intent: ${intent}

Claimed failure: ${finding.title}
Their command: ${finding.command}
Output they say it printed: ${finding.observed}
Output the intent requires: ${finding.expected}

Run the command, or your own equivalent if it depends on files you don't have. Write only under ${scratch}/. Set reproduced to true only if your own run shows the failure and it breaks the intent. Put what your run printed in observed, and one sentence of reasoning in reason.`;

/**
 * One Adversary per model attacks; each finding survives only if an Adversary on the next model reproduces it.
 * `tag` keeps subagent labels unique when several workflows or rounds call this.
 */
export async function runInterrogation(ctx, { scope, intent, models = MODELS.adversaries, tag = "i" }) {
    const verifierFor = (model) => models[(models.indexOf(model) + 1) % models.length];
    const perModel = await ctx.pipeline(
        models,
        (_, model) =>
            ctx.agent(attackPrompt(scope, intent, `./.scratch/interrogate-${model}`), {
                agent: "Adversary",
                model,
                label: `${tag}:attack:${model}`,
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
                    verdict: await ctx.agent(verifyPrompt(scope, intent, finding, `./.scratch/interrogate-verify-${verifier}`), {
                        agent: "Adversary",
                        model: verifier,
                        label: `${tag}:verify:${model}:${i}`,
                        schema: VERDICT_SCHEMA,
                    }),
                }))
            );
            return { model, failed: false, checked: checked.filter((c) => c !== null) };
        }
    );
    const confirmed = [];
    const dropped = [];
    for (const result of perModel.filter((r) => r !== null)) {
        for (const f of result.checked) {
            if (f.verdict?.reproduced === true) confirmed.push(f);
            else dropped.push({ ...f, dropReason: f.verdict ? f.verdict.reason : "verifier returned no result" });
        }
    }
    const failedAdversaries = perModel.map((r, i) => (r === null || r.failed ? models[i] : null)).filter((m) => m !== null);
    ctx.log(`${confirmed.length} confirmed, ${dropped.length} dropped`);
    return { models, confirmed, dropped, failedAdversaries };
}

/** Acceptance check by an agent that didn't write the code, plus a cross-family review. */
export async function checkAcceptance(ctx, { dir, what, criteria, testCommand, diffHint, tag }) {
    const list = criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
    const [tester, review] = await ctx.parallel([
        () =>
            ctx.agent(
                `Verify this change in ${dir}. Work only inside that directory and do not modify any tracked file; put scratch files under ${dir}/.scratch/.\n\nWhat it is: ${what}\n\nInstall dependencies if needed, run the build if there is one, and run the tests${testCommand ? ` with: ${testCommand}` : ""}. Then check each criterion below through the code's real interface (run it, call it, import it), not just by reading tests:\n${list}\n\nFor each criterion use status pass or fail only if you ran something that shows it; otherwise unverified. Paste commands and output. If there is no build step, set build.passed to true and build.command to "none".`,
                { agent: "Tester", label: `${tag}:tester`, schema: CRITERIA_SCHEMA }
            ),
        () =>
            ctx.agent(
                `Review this change in ${dir} against what it is for. ${diffHint}\n\nWhat it is: ${what}\nCriteria:\n${list}\n\nReport only blockers you verified in the code: unmet criteria, wrong behavior, broken callers, unhandled edge cases, security problems. Put lesser points in notes.`,
                { agent: "Reviewer", model: MODELS.verifier, label: `${tag}:review`, schema: REVIEW_SCHEMA }
            ),
    ]);
    const results = criteria.map((text, i) => tester?.criteria?.[i] ?? { text, status: "unverified", command: "", output: "tester returned no result" });
    return { tester, review, results };
}

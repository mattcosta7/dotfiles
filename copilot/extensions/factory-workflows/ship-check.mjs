import { defineWorkflow } from "@github/copilot-sdk/extension";
import { MODELS, bool, checkAcceptance, obj, repoRoot, runInterrogation, sh, str, strList, worktreeDir } from "./lib.mjs";

const CRITERIA_LIST_SCHEMA = obj({ criteria: { type: "array", items: obj({ text: str, inferred: bool }) } });

const resolveTarget = async (args, root) => {
    if (args.pr !== undefined && args.pr !== null && `${args.pr}`.trim()) {
        const r = await sh("gh", ["pr", "view", `${args.pr}`, "--json", "number,url,headRefOid,baseRefName,body,title"], root);
        if (r.code !== 0) throw new Error(`gh pr view ${args.pr} failed: ${r.out}`);
        const pr = JSON.parse(r.out);
        await sh("git", ["fetch", "-q", "origin", `pull/${pr.number}/head`, pr.baseRefName], root);
        return { kind: "pr", id: `pr-${pr.number}`, sha: pr.headRefOid, base: `origin/${pr.baseRefName}`, title: pr.title, body: pr.body ?? "", url: pr.url };
    }
    const sha = await sh("git", ["rev-parse", "--verify", `${args.ref}^{commit}`], root);
    if (sha.code !== 0) throw new Error(`unknown ref: ${args.ref}`);
    return { kind: "ref", id: `ref-${args.ref.replace(/[^\w.-]+/g, "-")}`, sha: sha.out.trim(), base: args.base || "main", title: args.ref, body: args.description ?? "" };
};

const currentSha = async (target, args, root) => {
    if (target.kind === "pr") {
        const r = await sh("gh", ["pr", "view", `${args.pr}`, "--json", "headRefOid", "--jq", ".headRefOid"], root);
        return r.code === 0 ? r.out.trim() : null;
    }
    const r = await sh("git", ["rev-parse", "--verify", `${args.ref}^{commit}`], root);
    return r.code === 0 ? r.out.trim() : null;
};

export const shipCheck = defineWorkflow({
    meta: {
        name: "ship-check",
        description:
            "Independent pre-merge verdict (PASS, PASS+NOTES, FAIL, or STALE) for one exact commit, checked out in its own worktree and run the way a user would. Never merges or comments. " +
            "args: { pr?: number|string, ref?: string, base?: string, description?: string, criteria?: string[], testCommand?: string, risky?: boolean, repo?: string } " +
            "Give pr for a GitHub pull request, or ref (and optionally base and description) for a local branch. risky adds an interrogation.",
        phases: [{ title: "Pin" }, { title: "Criteria" }, { title: "Verify" }, { title: "Verdict" }],
        argsSchema: {
            type: "object",
            properties: {
                pr: { type: ["string", "integer"] },
                ref: str,
                base: str,
                description: str,
                criteria: strList,
                testCommand: str,
                risky: bool,
                repo: str,
            },
        },
    },
    run: async (ctx) => {
        const args = ctx.args;
        if (!args.pr && !args.ref) throw new Error("give args.pr or args.ref");
        const root = await repoRoot(args.repo || process.cwd());

        ctx.phase("Pin");
        const target = await ctx.step(`target-${args.pr ?? args.ref}`, () => resolveTarget(args, root));
        const short = target.sha.slice(0, 7);
        const wt = await worktreeDir(root, `shipcheck-${target.id}-${short}`);
        // Not journaled: cleanup removes the worktree, so a resumed run must recreate it.
        const add = await sh("git", ["worktree", "add", "--detach", wt, target.sha], root);
        if (add.code !== 0 && !/already exists/.test(add.out)) throw new Error(`could not create worktree ${wt}: ${add.out}`);
        ctx.log(`checking ${target.sha} in ${wt}`);

        try {
            const diffStat = (await sh("git", ["diff", "--stat", `${target.base}...${target.sha}`], root)).out;

            ctx.phase("Criteria");
            let criteria = (args.criteria ?? []).filter((c) => c.trim()).map((text) => ({ text, inferred: false }));
            if (criteria.length === 0) {
                const derived = await ctx.agent(
                    `Write the acceptance criteria for this change as a short checklist: what a user of the change should be able to do, and what must still work. Use the description where it says what the change is for; where it doesn't, infer from the diff and mark inferred true.\n\nTitle: ${target.title}\nDescription:\n${target.body || "(none)"}\n\nRead the diff with: git -C ${root} diff ${target.base}...${target.sha}\nFiles changed:\n${diffStat}`,
                    { model: MODELS.reasoner, label: "criteria", schema: CRITERIA_LIST_SCHEMA }
                );
                criteria = (derived?.criteria ?? []).filter((c) => c.text.trim());
            }
            if (criteria.length === 0) return { verdict: "FAIL", sha: target.sha, reason: "no acceptance criteria could be written", target };

            ctx.phase("Verify");
            const what = `${target.title}\n${target.body}`.trim();
            const [acceptance, interrogation] = await ctx.parallel([
                () =>
                    checkAcceptance(ctx, {
                        dir: wt,
                        what,
                        criteria: criteria.map((c) => c.text),
                        testCommand: args.testCommand,
                        diffHint: `Read the diff with: git -C ${wt} diff ${target.base}...HEAD`,
                        tag: "ship",
                    }),
                () =>
                    args.risky === true
                        ? runInterrogation(ctx, { scope: `the change in ${wt} relative to ${target.base} (git -C ${wt} diff ${target.base}...HEAD); run everything inside ${wt}`, intent: what, tag: "ship" })
                        : null,
            ]);

            ctx.phase("Verdict");
            const { tester, review, results } = acceptance ?? { tester: null, review: null, results: [] };
            const buildOk = tester?.build?.passed === true;
            const testsOk = tester?.tests?.passed === true;
            const failed = results.filter((r) => r.status === "fail");
            const unverified = results.filter((r) => r.status !== "pass" && r.status !== "fail");
            const blockers = review?.blockers ?? [];
            const proven = interrogation?.confirmed ?? [];
            const notes = [...(review?.notes ?? []), ...criteria.filter((c) => c.inferred).map((c) => `criterion inferred, not stated: ${c.text}`)];

            let verdict;
            if (!tester || !buildOk || !testsOk || failed.length || blockers.length || proven.length) verdict = "FAIL";
            else if (unverified.length || notes.length) verdict = "PASS+NOTES";
            else verdict = "PASS";

            const now = await currentSha(target, args, root);
            if (now && now !== target.sha) {
                ctx.log(`head moved from ${short} to ${now.slice(0, 7)} during the check`);
                verdict = "STALE";
            }
            return {
                verdict,
                sha: target.sha,
                target: { kind: target.kind, id: target.id, url: target.url ?? null, base: target.base },
                build: tester?.build ?? null,
                tests: tester?.tests ?? null,
                criteria: results.map((r, i) => ({ ...r, inferred: criteria[i]?.inferred ?? false })),
                blockers,
                notes,
                interrogation: interrogation ? { confirmed: proven, dropped: interrogation.dropped.length } : null,
            };
        } finally {
            await sh("git", ["worktree", "remove", "--force", wt], root);
        }
    },
});

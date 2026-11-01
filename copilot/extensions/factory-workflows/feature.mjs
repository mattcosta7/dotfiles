import { defineWorkflow } from "@github/copilot-sdk/extension";
import { MODELS, bool, checkAcceptance, int, obj, repoRoot, runInterrogation, sh, str, strList, userCommand } from "./lib.mjs";

const SCOUT_SCHEMA = obj({
    files: { type: "array", items: obj({ path: str, why: str }) },
    patterns: strList,
    constraints: strList,
});
const DESIGN_SCHEMA = obj({
    dataShape: str,
    structure: str,
    workstreams: { type: "array", items: obj({ name: str, files: strList, brief: str }) },
    blockingFirst: str,
    whyThisSplit: str,
});
const BUILD_SCHEMA = obj({ summary: str, filesChanged: strList, stoppedBecause: str });

const disjoint = (streams) => {
    const seen = new Set();
    for (const s of streams) for (const f of s.files) {
        if (seen.has(f)) return false;
        seen.add(f);
    }
    return true;
};

export const feature = defineWorkflow({
    meta: {
        name: "feature",
        description:
            "Builds a feature end to end: Scout learns existing patterns, a design names the data shape and splits work into disjoint workstreams, Builders implement in parallel, " +
            "then tests, an independent acceptance check and a cross-family review gate it, with up to N fix rounds by fresh Builders. Leaves changes uncommitted. " +
            "args: { feature: string, acceptance: string[], testCommand?: string, risky?: boolean, maxFixRounds?: integer, pauseAfterDesign?: boolean, repo?: string }",
        phases: [{ title: "Explore" }, { title: "Design" }, { title: "Build" }, { title: "Verify" }, { title: "Interrogate" }],
        argsSchema: {
            type: "object",
            required: ["feature", "acceptance"],
            properties: {
                feature: str,
                acceptance: strList,
                testCommand: str,
                risky: bool,
                maxFixRounds: int,
                pauseAfterDesign: bool,
                repo: str,
            },
        },
    },
    run: async (ctx) => {
        const { feature: goal } = ctx.args;
        const acceptance = (ctx.args.acceptance ?? []).filter((a) => a.trim());
        if (!goal?.trim() || acceptance.length === 0) throw new Error("args.feature and at least one args.acceptance criterion are required");
        const testCommand = ctx.args.testCommand?.trim() || "";
        const maxFixRounds = Number.isInteger(ctx.args.maxFixRounds) && ctx.args.maxFixRounds >= 0 ? ctx.args.maxFixRounds : 2;
        const root = await repoRoot(ctx.args.repo || process.cwd());
        const criteria = acceptance.map((a, i) => `${i + 1}. ${a}`).join("\n");

        ctx.phase("Explore");
        const scout = await ctx.agent(
            `Research ${root} for this feature before anyone designs it. Find the files it will touch or depend on, how similar things are already done here (naming, structure, error handling, tests), and constraints it must respect.\n\nFeature: ${goal}`,
            { agent: "Scout", label: "explore", schema: SCOUT_SCHEMA }
        );

        ctx.phase("Design");
        const design = await ctx.agent(
            `Design this feature for ${root}. Name the data shape first and pick its organizing structure: a state machine over scattered booleans, a table or registry over branching, a typed model over repeated shape assumptions. Then split the work into workstreams. Workstreams run in parallel, so they must touch disjoint files; if they can't, use one workstream and say why. Each workstream brief must state its files, the data shape, and what not to touch.\n\nFeature: ${goal}\nAcceptance criteria:\n${criteria}\n\nScout findings:\n${JSON.stringify(scout ?? { note: "scout returned nothing" }, null, 1)}`,
            { model: MODELS.reasoner, label: "design", schema: DESIGN_SCHEMA }
        );
        if (!design || design.workstreams.length === 0) return { status: "no-design", scout };
        let streams = design.workstreams;
        if (!disjoint(streams)) {
            ctx.log("workstreams overlap on files; collapsing to one Builder");
            streams = [{ name: "all", files: [...new Set(streams.flatMap((s) => s.files))], brief: streams.map((s) => `${s.name}: ${s.brief}`).join("\n") }];
        }
        ctx.log(`${streams.length} workstream(s): ${streams.map((s) => s.name).join(", ")}`);
        if (ctx.args.pauseAfterDesign === true) await ctx.pause("after-design");

        ctx.phase("Build");
        const builds = await ctx.parallel(
            streams.map((s, i) => () =>
                ctx.agent(
                    `Implement your part of this feature in ${root}.\n\nFeature: ${goal}\nData shape: ${design.dataShape}\nStructure: ${design.structure}\nYour workstream: ${s.name}\nFiles you may change: ${s.files.join(", ")}\nBrief: ${s.brief}\n${streams.length > 1 ? "Other Builders are changing other files at the same time; touch only yours.\n" : ""}\nAcceptance criteria for the whole feature:\n${criteria}\n\nFollow existing patterns. Add or update tests for your part. Smallest change that meets the criteria. Do not commit or push. If a file outside your list must change, stop and say so in stoppedBecause.`,
                    { agent: "Builder", label: `build:${i}`, schema: BUILD_SCHEMA }
                )
            )
        );

        const rounds = [];
        let passed = false;
        for (let round = 0; round <= maxFixRounds && !passed; round++) {
            ctx.phase("Verify");
            const tests = testCommand ? await userCommand(testCommand, root) : null;
            const check = await checkAcceptance(ctx, {
                dir: root,
                what: goal,
                criteria: acceptance,
                testCommand,
                diffHint: `Read the uncommitted change with: git -C ${root} diff HEAD, plus untracked files from git -C ${root} status --short.`,
                tag: `verify:${round}`,
            });
            const failed = check.results.filter((r) => r.status === "fail");
            const unverified = check.results.filter((r) => r.status === "unverified");
            const blockers = check.review?.blockers ?? [];
            passed = (tests === null || tests.code === 0) && check.tester !== null && failed.length === 0 && blockers.length === 0;
            rounds.push({ round, testsPassed: tests ? tests.code === 0 : null, testOutput: tests?.out.slice(-1500) ?? null, criteria: check.results, unverified: unverified.length, blockers, notes: check.review?.notes ?? [] });
            ctx.log(`verify round ${round}: ${passed ? "passed" : `${failed.length} failed criteria, ${blockers.length} blockers${tests && tests.code !== 0 ? ", tests failing" : ""}`}`);
            if (passed || round === maxFixRounds) break;

            await ctx.agent(
                `Fix the problems below in ${root}. You are picking up someone else's uncommitted work: read it first with git -C ${root} diff HEAD and git -C ${root} status --short.\n\nFeature: ${goal}\nData shape: ${design.dataShape}\nAcceptance criteria:\n${criteria}\n\nProblems found by an independent check:\n${[
                    ...(tests && tests.code !== 0 ? [`- tests fail (${testCommand}):\n${tests.out.slice(-1500)}`] : []),
                    ...failed.map((f) => `- criterion failed: ${f.text}\n  ran: ${f.command}\n  saw: ${f.output.slice(0, 600)}`),
                    ...blockers.map((b) => `- review blocker at ${b.where}: ${b.issue} (${b.evidence})`),
                ].join("\n")}\n\nFix the cause, not the check. Do not weaken or delete existing tests. Do not commit or push.`,
                { agent: "Builder", label: `fix:${round + 1}`, schema: BUILD_SCHEMA }
            );
        }

        let interrogation = null;
        if (passed && ctx.args.risky === true) {
            ctx.phase("Interrogate");
            interrogation = await runInterrogation(ctx, { scope: `the uncommitted change in ${root} (git -C ${root} diff HEAD and untracked files)`, intent: `${goal}\nAcceptance criteria:\n${criteria}`, tag: "feature" });
        }
        const last = rounds[rounds.length - 1];
        const status = !passed ? "failed" : interrogation?.confirmed.length ? "proven-issues" : last.unverified || last.notes.length ? "done-with-notes" : "done";
        const diffStat = (await sh("git", ["diff", "--stat", "HEAD"], root)).out.trim();
        return { status, design: { dataShape: design.dataShape, structure: design.structure, workstreams: streams.map((s) => s.name), whyThisSplit: design.whyThisSplit }, builds, rounds, interrogation, diffStat };
    },
});

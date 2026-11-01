import { defineWorkflow } from "@github/copilot-sdk/extension";
import { MODELS, bool, commitAll, int, obj, oneOf, repoRoot, sh, str, strList, userCommand, worktreeDir } from "./lib.mjs";

const RUBRIC_SCHEMA = obj({ rubric: strList });
const CANDIDATE_SCHEMA = obj({ rationale: str, rejectedAlternatives: strList });
const JUDGE_SCHEMA = obj({
    scores: { type: "array", items: obj({ candidate: int, criterion: str, score: int, note: str }) },
    base: int,
    converged: bool,
    grafts: { type: "array", items: obj({ from: int, what: str }) },
    reasons: str,
});
const ADJUDICATE_SCHEMA = obj({ base: int, reasons: str });
const GRAFT_SCHEMA = obj({ applied: { type: "array", items: obj({ from: int, what: str }) }, skipped: { type: "array", items: obj({ what: str, reason: str }) } });

const total = (judge, i) => (judge?.scores ?? []).filter((s) => s.candidate === i).reduce((a, s) => a + s.score, 0);

export const arena = defineWorkflow({
    meta: {
        name: "arena",
        description:
            "Parallel attempts at one task on different models, each in its own git worktree and branch; two judges on different families score them against a hidden rubric, " +
            "tests outrank judgment, the best base gets grafts from the others, and the winner is left on its branch. " +
            "args: { task: string, artifact?: 'implementation'|'design', rubric?: string[], models?: string[], testCommand?: string, grounding?: string, repo?: string }",
        phases: [{ title: "Frame" }, { title: "Fan out" }, { title: "Judge" }, { title: "Graft" }, { title: "Verify" }],
        argsSchema: {
            type: "object",
            required: ["task"],
            properties: {
                task: str,
                artifact: oneOf("implementation", "design"),
                rubric: strList,
                models: strList,
                testCommand: str,
                grounding: str,
                repo: str,
            },
        },
    },
    run: async (ctx) => {
        const { task } = ctx.args;
        if (!task?.trim()) throw new Error("args.task must be a non-empty string");
        const artifact = ctx.args.artifact ?? "implementation";
        const models = ctx.args.models?.length >= 2 ? ctx.args.models : MODELS.builders;
        const testCommand = ctx.args.testCommand?.trim() || "";
        const root = await repoRoot(ctx.args.repo || process.cwd());
        const slug = ctx.runId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();

        ctx.phase("Frame");
        let rubric = (ctx.args.rubric ?? []).filter((r) => r.trim());
        if (rubric.length === 0) {
            const r = await ctx.agent(
                `Write 3 to 6 concrete, gradeable criteria for judging competing ${artifact === "design" ? "design sketches (types, signatures, module layout, stub bodies)" : "implementations"} of this task in ${root}. Read the relevant code first. Each criterion must be checkable by reading or running the result.\n\nTask: ${task}`,
                { model: MODELS.reasoner, label: "rubric", schema: RUBRIC_SCHEMA }
            );
            rubric = r?.rubric?.filter((x) => x.trim()) ?? [];
        }
        if (rubric.length === 0) throw new Error("no rubric: pass args.rubric");

        const base = (await sh("git", ["rev-parse", "HEAD"], root)).out.trim();
        const candidates = [];
        try {
            return await compete();
        } finally {
            for (const c of candidates) await sh("git", ["worktree", "remove", "--force", c.wt], root);
        }

        async function compete() {
            for (const [i, model] of models.entries()) {
                const wt = await worktreeDir(root, `arena-${slug}-${i}`);
                const branch = `arena/${slug}-${i}`;
                const add = await sh("git", ["worktree", "add", "-b", branch, wt, base], root);
                if (add.code !== 0 && !/already exists/.test(add.out)) throw new Error(`could not create worktree ${wt}: ${add.out}`);
                candidates.push({ index: i, model, wt, branch });
            }

            ctx.phase("Fan out");
            const work = await ctx.parallel(
                candidates.map((c) => async () => {
                    const result = await ctx.agent(
                        `${task}\n\n${ctx.args.grounding ? `Context:\n${ctx.args.grounding}\n\n` : ""}Produce ${artifact === "design" ? "a design sketch: types, signatures, module layout and stub bodies, as real files" : "a working implementation"}. Work only inside ${c.wt}; it is your own copy of the repository. Do not touch any other path. Do not commit, push or create branches.${testCommand ? ` The project's tests run with: ${testCommand}` : ""}\n\nFinish with a short rationale and the alternatives you considered and rejected.`,
                        { agent: "Builder", model: c.model, label: `candidate:${c.index}`, schema: CANDIDATE_SCHEMA }
                    );
                    const changed = await commitAll(c.wt, `arena candidate ${c.index} (${c.model})`);
                    const tests = testCommand ? await userCommand(testCommand, c.wt) : null;
                    const stat = (await sh("git", ["diff", "--stat", `${base}..HEAD`], c.wt)).out.trim();
                    return { ...c, result, changed, testsPass: tests ? tests.code === 0 : null, testOutput: tests?.out.slice(-1500) ?? null, stat };
                })
            );
            const entrants = work.filter((w) => w && w.result && w.changed);
            const dropouts = candidates.filter((c) => !entrants.some((e) => e.index === c.index)).map((c) => c.model);
            dropouts.forEach((m) => ctx.log(`dropout: ${m}`));
            if (entrants.length === 0) return { status: "no-candidates", rubric, dropouts };

            ctx.phase("Judge");
            const brief = entrants
                .map((e) => `Candidate ${e.index} (${e.model}), worktree ${e.wt}, branch ${e.branch}\nTests: ${e.testsPass === null ? "no test command" : e.testsPass ? "pass" : "FAIL"}\nFiles:\n${e.stat}\nRationale: ${e.result.rationale}`)
                .join("\n\n");
            const judgePrompt = `Judge competing attempts at this task. Read every candidate's diff end to end (git -C <worktree> diff ${base}..HEAD) and score each criterion 0 to 5 per candidate, from the code, not overall feel. Pick a base a future maintainer can extend without breaking invariants; when tied, prefer the smaller API. Set converged to true if the candidates arrived at essentially the same shape. List at most two grafts per losing candidate: specific things worth porting into the base.\n\nTask: ${task}\nRubric:\n${rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n${brief}`;
            const [judgeA, judgeB] = await ctx.parallel([
                () => ctx.agent(judgePrompt, { agent: "Reviewer", model: MODELS.verifier, label: "judge:a", schema: JUDGE_SCHEMA }),
                () => ctx.agent(judgePrompt, { model: MODELS.reasoner, label: "judge:b", schema: JUDGE_SCHEMA }),
            ]);
            const valid = (j) => j && entrants.some((e) => e.index === j.base);
            let pick;
            let agreement;
            if (valid(judgeA) && valid(judgeB) && judgeA.base === judgeB.base) {
                pick = judgeA.base;
                agreement = "judges agreed";
            } else if (valid(judgeA) && valid(judgeB)) {
                const adj = await ctx.agent(
                    `Two judges disagree on which candidate to build on. Read both rationales and the code, then pick one.\n\nJudge A (${MODELS.verifier}) picked ${judgeA.base}: ${judgeA.reasons}\nJudge B (${MODELS.reasoner}) picked ${judgeB.base}: ${judgeB.reasons}\n\n${brief}`,
                    { model: MODELS.reasoner, label: "adjudicate", schema: ADJUDICATE_SCHEMA }
                );
                pick = entrants.some((e) => e.index === adj?.base) ? adj.base : judgeA.base;
                agreement = `judges disagreed (${judgeA.base} vs ${judgeB.base}); adjudicated to ${pick}`;
            } else {
                pick = (valid(judgeA) ? judgeA : valid(judgeB) ? judgeB : null)?.base ?? entrants[0].index;
                agreement = "only one judge returned a usable result";
            }
            const passing = entrants.filter((e) => e.testsPass === true);
            const chosen = entrants.find((e) => e.index === pick);
            if (testCommand && chosen.testsPass !== true && passing.length) {
                const best = passing.sort((a, b) => total(judgeA, b.index) + total(judgeB, b.index) - total(judgeA, a.index) - total(judgeB, a.index))[0];
                agreement += `; overridden to ${best.index} because ${pick} fails the tests`;
                pick = best.index;
            }
            const winner = entrants.find((e) => e.index === pick);
            ctx.log(`base: candidate ${pick} (${winner.model}); ${agreement}`);

            ctx.phase("Graft");
            const converged = judgeA?.converged === true && judgeB?.converged === true;
            const wanted = converged ? [] : [...(judgeA?.grafts ?? []), ...(judgeB?.grafts ?? [])].filter((g) => g.from !== pick && entrants.some((e) => e.index === g.from));
            let graft = null;
            let graftReverted = false;
            if (wanted.length) {
                graft = await ctx.agent(
                    `Port these improvements into the base candidate in ${winner.wt}, working only inside that directory. Fold each in by hand so the result stays coherent; skip any that would not fit, and say why.\n\n${wanted.map((g) => `- from candidate ${g.from} (${entrants.find((e) => e.index === g.from).wt}): ${g.what}`).join("\n")}\n\nRead a source candidate's version with: git -C <its worktree> diff ${base}..HEAD. Do not commit.`,
                    { agent: "Builder", label: "graft", schema: GRAFT_SCHEMA }
                );
                await commitAll(winner.wt, "arena graft");
            }

            ctx.phase("Verify");
            let finalTests = testCommand ? await userCommand(testCommand, winner.wt) : null;
            if (finalTests && finalTests.code !== 0 && graft && winner.testsPass === true) {
                await sh("git", ["reset", "--hard", "HEAD~1"], winner.wt);
                graftReverted = true;
                finalTests = await userCommand(testCommand, winner.wt);
                ctx.log("graft broke the tests and was reverted");
            }

            return {
                status: finalTests && finalTests.code !== 0 ? "winner-fails-tests" : "complete",
                winner: { candidate: winner.index, model: winner.model, branch: winner.branch },
                mergeWith: `git merge ${winner.branch}`,
                agreement,
                converged,
                rubric,
                judges: { a: judgeA, b: judgeB },
                grafts: graft ? { ...graft, reverted: graftReverted } : null,
                finalTests: finalTests ? { passed: finalTests.code === 0, output: finalTests.out.slice(-1500) } : null,
                candidates: entrants.map((e) => ({ candidate: e.index, model: e.model, branch: e.branch, testsPass: e.testsPass, rejectedAlternatives: e.result.rejectedAlternatives })),
                dropouts,
            };
        }
    },
});

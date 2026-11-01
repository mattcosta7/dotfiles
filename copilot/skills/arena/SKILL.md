---
name: arena
description: Run N parallel attempts at the same task on different models, pick the best base, and graft the strongest parts of the others into it. Use for /arena, "arena this", or when one attempt at a non-trivial design or implementation would lock in the wrong shape.
argument-hint: The task to run in the arena
---

# Arena

Adapted from pstack by Lauren Tan (MIT).

Open a todo list with one item per phase (Frame, Fan out, Judge, Pick, Graft, Verify) before launching anything.

## A. Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate produces: a design sketch (types, signatures, module layout, stub bodies) or a working implementation.
2. Write a rubric of 3 to 6 concrete, gradeable criteria for this task. Only you and the judge see it. Candidates see the task.
3. Pick 2 or 3 runners. Default to Builder on two model families where available, for example one Claude and one GPT model in Copilot, or opus and sonnet in Claude Code, requested explicitly. Use the same model several times only when the work is generation-heavy rather than judgment-heavy.
4. Isolate each candidate, per the separate-before-serializing-shared-state principle. Subagents share one workspace, so in a git repo create a worktree per candidate before fanning out:
   `git worktree add ../<repo>-arena-<slug>-<n> -b arena/<slug>-<n>`
   Outside git, use `./.scratch/arena-<slug>/candidate-<n>/`. Never let two candidates write the same path.

## B. Fan out

Launch all candidates in parallel. Each gets the task, the grounding (Scout findings, relevant files), its own output path, and an instruction to work only inside that path and to finish with a short rationale naming the alternatives it considered and rejected. If a candidate produces nothing, continue with the rest and note the dropout.

## C. Judge

After all candidates finish, run one Reviewer subagent on a model family different from yours. It gets the rubric and the candidates by path, scores each criterion, and recommends a base with reasons.

## D. Pick a base

Read every candidate end to end. Score each against the rubric criterion by criterion, not on overall feel, and compare with the judge. Agreement confirms the pick. Disagreement means bias or an ambiguous rubric, so read both rationales before deciding. Prefer the base a future maintainer can extend without breaking invariants. When tied, prefer the smaller API.

## E. Graft

Walk each losing candidate once for what's worth porting, usually one or two things each. Fold each graft in by hand so the result stays coherent. If the candidates converged on one shape, that's strong agreement, so ship it with no graft. If they diverged wildly, the frame was under-specified, so reframe and rerun rather than averaging.

## F. Verify and clean up

Verify the result like any other output (the prove-it-works principle). Bring the winning result into the main working tree, then remove the worktrees and branches:
`git worktree remove <path> && git branch -D arena/<slug>-<n>`

## Output

The synthesized artifact plus a short note: the base and why, the judge's verdict, each graft and its source, what was rejected and why, any convergence or dropouts, and the verification result.

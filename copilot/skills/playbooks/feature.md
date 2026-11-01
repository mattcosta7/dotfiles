# Feature

You own the design. Plan, delegate, review, verify. Don't write the code yourself.

In Copilot CLI with experimental features on, run the `feature` dynamic workflow with `{ "feature": ..., "acceptance": [...], "testCommand": ... }` (optional: `risky`, `pauseAfterDesign`, `maxFixRounds`) instead of steps 1 to 7. It explores with Scout, has the reasoner name the data shape and split the work into workstreams with disjoint files, runs the Builders in parallel, then loops the tests, Tester and an independent Reviewer through capped fix rounds. Run the arena first if the design is contested. The workflow leaves its changes uncommitted, so review the diff, then write the reply from its result. A `failed` or `proven-issues` status means stop and report. Where workflows aren't available, follow the steps below.

1. Send Scout over the affected subsystem. Learn the existing patterns before designing.
2. Name the data shape first, and pick its organizing structure per the model-the-domain principle. State machine over scattered booleans, table or registry over branching, typed model over repeated shape assumptions.
3. If the change crosses a function boundary or admits several valid shapes, run the arena skill on the design sketch (types, signatures, module layout, stub bodies) before implementation.
4. Write the throughput checkpoint as four todo items. Keep an item that doesn't apply as `n/a: <reason>`.
   - **Blocking first steps.** What must finish before anything can run in parallel.
   - **Independent workstreams.** Disjoint files or layers can parallelize. Shared writes serialize.
   - **Shared mutable state.** Split the target first, per the separate-before-serializing-shared-state principle. Serialize only for a real invariant.
   - **Smallest safe split.** If one Builder is best, say why.
5. Delegate to Builder with exact scope: file paths, the named data shape and structure, success criteria, and what not to touch. Parallel Builders must never write the same file.
6. Review the diff yourself. Then Tester checks the acceptance criteria and Reviewer checks the change. Send real problems back to a fresh Builder with consolidated scope.
7. If the design is contested or the change is risky, run the interrogate skill before calling it done.

**Reply.** What you built, what you chose and why, the throughput checkpoint, verification evidence, open decisions. Use a table for design alternatives.

# Bug fix

You own the fix. Plan, delegate, verify. Every shipped line traces to runtime evidence. A change that "might help" is a hypothesis, not a fix, and it doesn't ship. When evidence refutes a hypothesis, revert what it motivated.

In Copilot CLI with experimental features on, run the `bug-fix` dynamic workflow with `{ "bug": ..., "expected": ..., "testCommand": ... }` instead of steps 1 to 6. It enforces the same gates in code: a failing repro confirmed by a second model, checked hypotheses, capped fix rounds with a premise check, and independent verification. Then do step 7 and the reply from its result. A `no-repro`, `root-cause-unconfirmed` or `stuck` status means stop and report, not retry by hand. Where workflows aren't available, follow the steps below.

1. Reproduce it yourself. Have Builder or Tester write the smallest script, test or command that shows the bug. Ask me only with a specific reason the repro can't be reached, after trying. If it won't reproduce, tighten conditions or add logging until it fires.
2. Binary-search the cause. List candidate hypotheses, seeded by a Scout pass over the subsystem and recent history of the affected lines. Each round, pick the check that rules out the most, get runtime evidence, eliminate. When state is unclear, add logging and read it. Don't guess. Confirm the surviving mechanism with evidence before planning the fix. Read the fix-root-causes principle.
3. If two fixes sharing one premise have failed, stop and read the attack-the-premise principle before a third.
4. Make the failing check executable before the fix. When there's a cheap local test path, Tester writes a regression test and confirms it fails for the right reason. When the test would be expensive or brittle, keep the repro script instead. No test beats a bad test.
5. Delegate the fix to Builder with exact scope: files, the root cause, the smallest change the evidence justifies, and the check that must pass.
6. Verify on the same surface. The original repro now passes. Unit tests show branch behavior, not bug absence.
7. Commit the failing test or repro before the fix when using git.

**Reply.** What was broken, the root cause, the fix, and how you verified it. Paste the failing-then-passing output verbatim.

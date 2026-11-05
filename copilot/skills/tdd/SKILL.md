---
name: tdd
description: "Drive a change with one red-green-refactor slice: write a failing test for observable behavior, confirm it fails for the right reason, then make the smallest production change. Use when the user asks for TDD, test-first, a failing test, or a regression test for a bug, or when a bug has an obvious cheap local test target."
---

# TDD: one observable slice

Adapted from pstack by Lauren Tan (MIT). See [NOTICE-pstack-LICENSE.txt](../../NOTICE-pstack-LICENSE.txt). Source: <https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md>

Make one behavior executable before changing production code. Work one slice at a time. Do not write a batch of tests first.

## When to skip

Skip a new test when the path is unclear or costly: broad harness setup, brittle mocks, slow end-to-end infrastructure, production-only state, or unrelated fixture churn. Use the closest executable check instead (targeted script, repro command, browser automation, focused integration check) and say so. No test beats a bad test, such as one that mostly asserts mocks, copies the implementation, or depends on timing.

## Slice

1. **Pick one observable behavior.** State intended behavior, current behavior, and the smallest reproduction. For a bug, that is the failing case.
2. **Choose the narrowest existing test seam.** Reuse the project's runner, helpers, and test location. Test through the public interface (exported function, component output, HTTP response, CLI result). Do not test private functions or internal call order.
3. **Red.** Write the smallest test that encodes the intended behavior. Run only that test before touching production code. Confirm it fails for the intended reason: the assertion about the behavior, not an import error, typo, or missing fixture. If it passes or fails for another reason, fix the test first.
4. **Green.** Make the smallest production change that passes. Rerun the test.
5. **Refactor.** With the test green, remove duplication or improve names. Rerun the test and nearby tests. Do not change behavior here.
6. **Repeat** for remaining requested behavior and relevant edge cases, one slice at a time. Stop when the acceptance criteria are met.

## Example slice

Bug: `parseDuration("1m30s")` returns `60000`, and it should return `90000`.

```ts
// Red: run only this file, expect "expected 60000 to be 90000"
it("adds minutes and seconds", () => {
	expect(parseDuration("1m30s")).toBe(90000);
});
```

Fix `parseDuration` to sum every unit. Rerun the test (green). Then tidy the parser and rerun the file.

## Guardrails

- Do not edit a test to match wrong behavior, or weaken an assertion unless the expected behavior truly changed.
- Keep the test on the bug. No broad fixture churn or coverage expansion.
- Make flaky cases deterministic (fake clock, fixed seed) before relying on them.
- Preserve the test runner's exit status. Run it directly or capture its status before filtering logs. A passing `grep` or `tail` is not a passing test run.
- If the bug points to sibling failures, land the focused regression first, then consider more.
- Match the project's test style. Do not add a framework.
- Do not commit or push unless asked.

## Report

- The test or check that failed first, and its failure message.
- The passing rerun and any nearby validation.
- If you could not show red, say why and name the substitute check.

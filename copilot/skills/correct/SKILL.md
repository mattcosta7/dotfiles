---
name: correct
description: Prevent recurring repository mistakes with architecture, types, lint rules or behavior tests. Use for /correct, "stop agents repeating this mistake", or enforcing a repeated review correction.
---

# Correct

Adapted from [pstack correct](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Turn a demonstrated recurring mistake into a check or structure that rejects it. `reflect` proposes lessons and waits for approval. Use this skill to implement an explicitly requested prevention, not to expand every correction into a repository-wide rewrite.

## Establish the mistake

Read the user's correction, implicated code and existing checks. Inspect relevant commits, reverts or review comments only as needed. Group examples by the same violated invariant rather than by wording.

Treat a class as recurring when at least two concrete instances support it. An explicit request to prevent a single costly mistake can justify a focused check, but do not claim a pattern that has not been observed.

State the invariant, a real violating example, and the intended allowed case. If the behavior is a preference with legitimate exceptions, clarify the boundary before making it mandatory.

## Choose the smallest effective enforcement

Prefer the highest effective level that stays within scope:

1. Remove the invalid path structurally. Give state one owner, remove obsolete APIs, or derive duplicate data from one source.
2. Encode the invariant in the existing type system where the compiler can reject invalid states.
3. Add a focused existing-linter or CI check when the mistake is syntactic or cross-file. Its error names the supported alternative.
4. Add a regression test when the invariant is observable behavior.
5. Add or tighten agent instructions only for judgment that a reliable check cannot encode.

Do not force a large architecture change when a narrow check solves the problem. Reuse existing tooling and avoid a new dependency unless necessary and authorized. Do not add prose that merely repeats a machine-enforced rule.

## Prove the enforcement

Use `tdd` for a new behavior test. For a type, lint or CI check, use an isolated fixture or temporary copy to show:

- The real past mistake fails with a useful diagnostic.
- The intended valid case passes.
- The corrected repository passes the same check.

Keep negative fixtures outside production inputs unless the existing test suite has a supported negative-test convention. Preserve runner exit status. Do not weaken the check, change compiler strictness or add a broad exclusion to make it pass.

For a repository with legacy violations, gate new violations when a full migration is outside scope. An exception must be narrow, justified and consistent with existing project policy.

## Report

Name the prevented mistake, its evidence, the enforcement location and the failing and passing cases. Explain why a broader structural change was unnecessary when that tradeoff matters. If reliable enforcement is not possible, say so and propose the smallest judgment rule instead.

Do not create a standing rule inventory, rewrite unrelated instructions, commit changes or publish issues unless requested.

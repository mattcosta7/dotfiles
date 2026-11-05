---
name: create-verification-skill
description: Create and exercise a project-local skill that verifies the real app, CLI, API or library. Use for "create a verification skill", "make a control skill for this repo", or adding a repeatable user-path check.
---

# Create a verification skill

Adapted from [pstack create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Produce a runnable project-specific verification procedure. Generic advice and an unexecuted generated file are not a completed verification skill.

## Discover the real target

Read the repository before asking questions. Establish:

- What users interact with, such as a browser page, CLI, API or exported library.
- The existing build, launch and test commands, including required versions, environment and fixtures.
- The existing way to drive it, such as browser tooling, a PTY, HTTP requests or public exports.
- The observable result and side effects that prove the behavior.
- How to isolate ports, data directories, accounts and processes from other work.

Reuse existing runners and helpers. Do not install a framework or add a new dependency just to generate a skill. Never drive an unrelated live instance or send real messages, charge accounts or delete data for verification.

If the base cannot run, report the exact blocker. Fix it only when that repair is within the request. Do not generate apparently verified instructions against a broken base.

## Generate the smallest useful skill

Write `.github/skills/verify-<app>/SKILL.md` with a matching `name` and a description naming the app, interface and task triggers. Check for an existing skill first and update it rather than creating a duplicate.

Fill every section from observed repository behavior. No placeholder commands, invented selectors or guessed routes.

| Section | Required content |
|---|---|
| Launch | Exact build and start commands, isolated configuration and a usable readiness condition. For a library or short-lived CLI, explain that no server is needed. |
| Doctor | A read-only check for the expected version, usable instance, authentication and ownership. |
| Drive | Exact actions through the public interface, with stable selectors, arguments or exports. |
| Evidence | Assertions about visible output and relevant side effects, plus the location of captured artifacts. |
| Cleanup | Stop only owned process IDs and remove only specifically identified scratch data. Keep evidence. |

Use the session artifact directory for temporary proof when available. Put repository-local helpers under the generated skill only when needed, document their invocation and ensure scripts can be run as documented.

For multiple user journeys, add a short feature table with each entry point, preconditions, actions and expected result. Separate feature files are justified only when the table becomes hard to follow.

## Execute before handing over

1. Follow the generated instructions from launch through cleanup.
2. Exercise at least one real mapped feature and assert its result. Do not substitute an internal setter, mock response or test-only endpoint for a user path.
3. Capture the action, result and relevant side effects. Preserve runner exit codes. A nominal dry-run is not proof of no side effects.
   Verify that a filtered test command actually selects the intended tests. Describe the observed reporter output rather than guessing its format.
4. Clean up after failed attempts too. Check that the proof artifacts still exist after cleanup and that owned processes stopped.
5. Correct the instructions and rerun any failed step.

Use a bounded process for a self-contained check and stop it before returning. Do not leave a server running unless requested.

Report the generated path, exact feature exercised, evidence and uncovered journeys. If execution is blocked, call the result a draft and identify what remains unverified. Do not commit or publish unless requested.

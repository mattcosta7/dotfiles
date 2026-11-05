---
name: maintain-verification-skill
description: Audit a project-local verification skill against current source and live behavior, then fix proven documentation or helper drift. Use when asked to maintain a verification skill or audit a verify skill.
---

# Maintain a verification skill

Adapted from [pstack maintain-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Keep the verification procedure accurate without changing product behavior to make it pass.

## Scope and coverage

Locate the existing verification skill, usually `.github/skills/verify-*/SKILL.md`. If none exists, report that and suggest `create-verification-skill`. If several exist and the request does not identify one, ask which to maintain.

Read its launch, doctor, drive, evidence and cleanup instructions. Read any feature table or linked feature files. Check that the index and files agree, with no dead links or duplicate journeys.

Trace each documented feature to current source. Identify changed commands, selectors, arguments, prerequisites and observable results. Search recent relevant changes for missing user journeys, but require a real entry point before calling one missing.

Work directly for a small map. Delegate only substantial independent source research. Keep live interaction under one owner so agents do not drive a shared app concurrently.

## Live pass

1. Follow the skill's isolation and launch model. Use one owned instance for a service or UI, or a fresh isolated session for each short-lived CLI journey.
2. Run doctor before the first drive and after a surprising failure. Reset an unusable UI state even if the underlying process still answers.
3. Exercise every mapped feature at least once. Record each as passed, failed or blocked, with its concrete prerequisite and attempted entry point.
4. Distinguish documentation drift, a verification-helper gap and a product regression. Source that looks correct does not replace the live pass.
5. After a documentation or helper fix, rerun the affected journey. If a changed startup instruction invalidates the instance, restart only what this run owns.
6. Clean up after failed attempts and at the end. Stop only owned process IDs, remove only identified scratch data, and confirm the evidence survives.

Missing credentials, unavailable platforms or external prerequisites are blocked coverage, not passing coverage. Do not remove a failing journey or weaken its expected result just to call the map clean.

## Edits and outcome

Edit only the verification skill's directory and helpers it owns. Report product bugs without editing product code. Preserve executable helper behavior and documented invocation.

Report one outcome:

- `clean` means every mapped feature has source and live coverage with no corrections needed.
- `changed` means verified documentation or helper corrections were made. List any remaining coverage gaps.
- `blocked` means the pass or required re-verification could not finish. Name the exact blocker.

Keep coverage notes and proof in session artifacts. Give the edited paths and per-feature results. Do not commit, open a PR or publish evidence unless requested.

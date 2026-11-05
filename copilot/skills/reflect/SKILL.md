---
name: reflect
description: Review the current session for durable lessons and propose concrete changes to agents, skills, instructions or checks. Use for /reflect or "capture what we learned".
---

# Reflect

Adapted from [pstack reflect](https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Mine this conversation for lessons that should change how the factory works next time, then propose edits. Skip if the session was trivial or went exactly as the existing instructions said. One-offs are not lessons.

## 1. Gather

Write a tight digest of the session: the goal, what each agent did, where it went wrong or slow, every correction I made, and anything that took several tries.

## 2. Review through three lenses

Review the digest directly through all three lenses. Delegate only when the record is large enough to benefit from independent review or the user requests multiple reviewers. Use configured model defaults.

- **Judgment.** Where did an agent make a wrong call, ask when it should have acted, or act when it should have asked? Which instruction would have prevented it?
- **Tooling.** Which repeated manual step should be a script, test, lint rule or type? Which tool or command failed, and why?
- **Divergent.** What would a very different workflow have done here? Is any agent, skill or step not earning its place?

Support each finding with conversation evidence. Separate an instruction that was missing from an existing instruction that was ignored. Do not add another rule for the latter without explaining why it will work.

## 3. Synthesize

Sort every finding into **Accepted**, **Rejected** (with reason) or **Backlog**. For each Accepted item, give the exact target file and the edit. Targets, in order of preference:

1. A script, test, lint rule or type in the project (read the encode-lessons-in-structure principle). If it can be enforced this way, prefer that over more text.
2. An existing agent or skill. Resolve the installed links and locate the intended dotfiles checkout before choosing a destination. For third-party skills listed in `skills.lock`, an in-place edit is temporary because sync overwrites it. Propose an upstream change or an explicitly maintained local adaptation. `skill-sources.txt` selects sources and exclusions, not content patches.
3. The factory's `copilot-instructions.md`, only for rules that apply to every task.

Move anything a check would enforce better than prose to Backlog with the proposed check.

## 4. Apply only after approval

Show the Accepted, Rejected and Backlog lists and wait for me to pick. Never auto-apply. After approval, make only the approved edits in the confirmed source checkout and verify them. Do not commit, push or file backlog issues unless explicitly requested.

Report the exact edited paths and any remaining decisions. Changes apply through installed symlinks only when they point to the checkout you edited. Keep backlog items local unless publishing them is authorized.

---
name: playbooks
description: Step-by-step playbooks for investigation, bug fixes, features, refactoring and prototypes. The Architect agent loads this at the start of every task to pick a playbook and copy its steps into the todo list.
user-invocable: false
---

# Playbooks

Adapted from pstack by Lauren Tan (MIT).

Match the task to one playbook, open its file, and copy its numbered steps verbatim into the todo list before any task-specific items. A step you choose not to do stays in the list as `skip: <reason>`.

| Playbook | Use when |
|---|---|
| [Investigation](./investigation.md) | A read-only question. How does X work, why is Y built this way, are we sure, should we do X or Y. |
| [Bug fix](./bug-fix.md) | A defect to reproduce, root-cause and fix with runtime evidence. |
| [Feature](./feature.md) | New or changed behavior. |
| [Refactoring](./refactoring.md) | Structure changes, behavior does not. Rename, extract, inline, dedupe, move. |
| [Prototype](./prototype.md) | A throwaway sketch to settle a design or behavior question by observing it instead of asking. |

If no playbook fits, write a short bespoke one in the same shape (numbered steps, each ending in something checkable) and say that you did.

## Every playbook ends the same way

1. Prove it works on the real artifact. Wrong-surface or "inconclusive" is not a pass, so flag it.
2. Arrange the work as small ordered commits when the repo uses git. Don't push or open a PR unless asked.
3. Reply per the reply rules in the Architect agent.

---
name: setup-mattcosta7
description: Inspect and configure mattcosta7 mode, installed Copilot agents and skills, and model preferences. Use for "setup mattcosta7 mode", "configure my agents", or changing model and reasoning preferences.
---

# Setup mattcosta7

Adapted from [pstack setup-pstack](https://github.com/cursor/plugins/blob/main/pstack/skills/setup-pstack/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Configure supported Copilot settings, not Cursor rules or a parallel model registry.

## Inspect before changing

1. Read the current Copilot CLI documentation or installed help for the capabilities involved. Model identifiers, settings and commands change. Do not guess supported names or syntax.
2. Inspect the active configuration scope, installed agents and skills, and the targets of relevant symlinks. Do not assume the active dotfiles checkout is the installed one.
3. Read agent frontmatter for model overrides. If factory workflows are in scope, also inspect their existing `extensions/models.json`. Report these as separate consumers, not a single synchronized setting.
4. Identify missing or conflicting configuration. Do not dump tokens, MCP credentials or unrelated machine settings.

## Choose scope and preferences

Ask only for decisions that the environment cannot answer. Confirm whether a preference applies to the session, repository or user, and which roles it covers.

- Use the supported model picker and subagent configuration interface, currently `/model` and `/subagents`, after checking current help.
- Prefer inherited defaults. `mattcosta7-mode` deliberately has no fixed model.
- Do not invent an effort suffix, assume model entitlement, or copy upstream Cursor model slugs.
- Do not pin models in agent files or workflow configuration unless that consumer is explicitly in scope.
- Explain the cost and fan-out implications of an explicitly requested multi-agent configuration. No automatic fleet, arena or evaluation run.

If a preference is only exposed interactively, give the verified picker command and choices. Do not pretend to have persisted it by writing an undocumented JSON key.

## Apply and verify

Show the proposed settings and their destinations before changing preferences. Preserve unrelated settings and local credentials. A setup request is not permission to overwrite an existing installation or redirect links to a different checkout.

For installation, use the repository's existing `copilot/install.sh` only when that installation is requested. Explain any existing links it will replace first. Do not run the root dotfiles installer just to add an agent.

Read back each changed value and verify the installed agent or skill is discoverable in a fresh session. Repeating setup with the same choices must not create duplicate rules or model mappings.

Report what changed, where it is stored, what remains inherited, and whether a new session is required. Do not claim a preference was saved when you only supplied instructions.

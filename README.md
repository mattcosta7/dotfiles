# dotfiles

My shell, editor and Copilot CLI configuration.

## What's here

- `.zshrc`: zsh with Oh My Zsh (autosuggestions and syntax highlighting plugins)
- `.gitconfig`, `gitignore_global`: git aliases, colors and global ignores
- `tmux.conf`, `vimrc`, `vim/`, `emacs`, `screenrc`: terminal and editor config
- `copilot/`: Copilot CLI agents, skills, extensions and settings, linked into `~/.copilot`

## Install

### Codespaces

In GitHub settings under Codespaces, set this repo as your dotfiles repository. `install.sh` runs automatically when a codespace is created.

### Local

```sh
git clone https://github.com/mattcosta7/dotfiles
cd dotfiles
./install.sh
```

The script is safe to rerun. Files are symlinked into `$HOME`, so edits in the checkout apply immediately. Existing files that would be replaced are moved to `~/.dotfiles-backup-<timestamp>`.

## Machine-only settings

Put tokens and per-machine settings in `~/.zshrc.local`. `.zshrc` sources it if present, and it is not tracked.

## Copilot working modes

Select `/agent mattcosta7-mode` for hands-on work with sparse delegation and real-artifact verification. It inherits the selected model. Architect remains the delegation-heavy coordinator.

The local pstack adaptations add `tdd`, `statechart`, `typescript-best-practices`, `technical-writing`, `benchmark-checklist`, `recall` and `setup-mattcosta7`. Existing `unslop` and `reflect` cover prose cleanup and session lessons. Use `/skills` to inspect installed skills. Setup and recall run only when explicitly invoked.

Routine TypeScript guidance complements `typescript-magician` for advanced type problems. `technical-writing` complements `documentation` for document structure. The existing `best-practices` skill covers web audits.

`blast-radius` checks indirect change impacts, and `why` investigates design history. Explicitly invoke `create-verification-skill` to generate a project-local verification procedure, `show-me-your-work` for a local decision trail, or `correct` to enforce a recurring lesson.

`maintain-verification-skill` audits those procedures as the app changes. `sharpen` improves a task brief without expanding its scope. `teach` explains a subsystem through real code and supported rationale.

Request-only skills remain loadable in Copilot prompt mode. Their instructions and the mode's routing policy require an explicit request before running them.

These are maintained local adaptations, not entries in `copilot/skills.lock`. `copilot/sync-skills.sh` refreshes the separately vendored skills. Attribution is in `copilot/NOTICE-pstack-LICENSE.txt`.

## Requirements

`git`, `curl` and `zsh`. `jq` is needed to merge the Copilot settings.

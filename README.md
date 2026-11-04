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

## Requirements

`git`, `curl` and `zsh`. `jq` is needed to merge the Copilot settings.

#!/bin/sh
# Links dotfiles into $HOME, installs Oh My Zsh and its plugins, and includes .gitconfig.
# Safe to rerun. Existing real files are moved to ~/.dotfiles-backup-<timestamp>.
set -eu

src="$(cd "$(dirname "$0")" && pwd)"
backup="$HOME/.dotfiles-backup-$(date +%Y%m%d%H%M%S)"

link() {
    target="$2"
    if [ -L "$target" ]; then
        :
    elif [ -e "$target" ]; then
        mkdir -p "$backup"
        mv "$target" "$backup/"
        echo "dotfiles: moved existing $target to $backup/"
    fi
    ln -sfn "$1" "$target"
}

if ! command -v zsh >/dev/null 2>&1; then
    echo "dotfiles: zsh not found, install it to use the shell config"
fi

# Before linking .zshrc, so the installer can't replace it.
ZSH="${ZSH:-$HOME/.oh-my-zsh}"
if [ ! -d "$ZSH" ]; then
    RUNZSH=no CHSH=no KEEP_ZSHRC=yes sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

ZSH_CUSTOM="${ZSH_CUSTOM:-$ZSH/custom}"
for repo in zsh-users/zsh-autosuggestions zsh-users/zsh-syntax-highlighting; do
    plugin="$ZSH_CUSTOM/plugins/${repo#*/}"
    if [ ! -d "$plugin" ]; then
        git clone --depth 1 "https://github.com/$repo.git" "$plugin"
    fi
done

link "$src/.zshrc" "$HOME/.zshrc"
link "$src/tmux.conf" "$HOME/.tmux.conf"
link "$src/vimrc" "$HOME/.vimrc"
link "$src/vim" "$HOME/.vim"
link "$src/emacs" "$HOME/.emacs"
link "$src/screenrc" "$HOME/.screenrc"
link "$src/gitignore_global" "$HOME/.gitignore_global"

if [ -z "$(git config --global --get core.excludesfile || true)" ]; then
    git config --global core.excludesfile "$HOME/.gitignore_global"
fi

# Include rather than copy, so Codespaces' own ~/.gitconfig (credential helper, user) stays intact.
if ! git config --global --get-all include.path | grep -qxF "$src/.gitconfig"; then
    git config --global --add include.path "$src/.gitconfig"
fi

sh "$src/copilot/install.sh"

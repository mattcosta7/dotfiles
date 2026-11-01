#!/bin/sh
# Links Copilot agents, skills, instructions and MCP servers into ~/.copilot. Safe to rerun.
set -eu

src="$(cd "$(dirname "$0")" && pwd)"
dest="$HOME/.copilot"
backup="$dest/.backup-$(date +%Y%m%d%H%M%S)"
mkdir -p "$dest"

for name in agents skills copilot-instructions.md mcp-config.json; do
    target="$dest/$name"
    if [ -L "$target" ]; then
        rm "$target"
    elif [ -e "$target" ]; then
        mkdir -p "$backup"
        mv "$target" "$backup/"
        echo "copilot: moved existing $target to $backup/"
    fi
    ln -s "$src/$name" "$target"
done

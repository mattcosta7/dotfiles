#!/bin/sh
# Links Copilot agents, skills, extensions, instructions, MCP servers and the status line into ~/.copilot,
# and merges settings.base.json into settings.json. Safe to rerun.
set -eu

src="$(cd "$(dirname "$0")" && pwd)"
dest="$HOME/.copilot"
backup="$dest/.backup-$(date +%Y%m%d%H%M%S)"
mkdir -p "$dest"

for name in agents skills extensions copilot-instructions.md mcp-config.json statusline.sh; do
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

# settings.json is merged, not linked: the CLI also writes machine-local keys into it (allowedUrls, trust).
settings="$dest/settings.json"
if ! command -v jq >/dev/null 2>&1; then
    echo "copilot: jq not found, skipped merging settings.base.json (status line and defaults not applied)"
else
    [ -f "$settings" ] || echo '{}' > "$settings"
    if merged=$(jq -s '.[0] * .[1]' "$settings" "$src/settings.base.json" 2>/dev/null); then
        if [ "$(printf '%s' "$merged" | jq -c .)" != "$(jq -c . "$settings")" ]; then
            mkdir -p "$backup"
            cp "$settings" "$backup/settings.json"
            printf '%s\n' "$merged" > "$settings"
            echo "copilot: merged settings.base.json into $settings (previous copy in $backup/)"
        fi
    else
        echo "copilot: $settings is not valid JSON, left untouched"
    fi
fi

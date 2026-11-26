#!/bin/sh
# Installs the shared node_modules for the React evals, once per React version, into a cache outside the repo.
# Usage: sh copilot/evals/react/setup.sh [version ...]   (default: 18.3.1 19.2.9 19.3.1)
# Prints the cache root. Reinstalls a version only when its dependency list changes.
set -eu

root="${REACT_EVALS_DEPS:-$HOME/.cache/react-evals}"
versions="${*:-18.3.1 19.2.9 19.3.1}"

for v in $versions; do
    dir="$root/$v"
    mkdir -p "$dir"
    cat > "$dir/package.json.next" <<JSON
{
  "name": "react-evals-deps-$v",
  "private": true,
  "type": "module",
  "dependencies": {
    "@tanstack/react-query": "5.108.1",
    "eslint": "10.15.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "global-jsdom": "31.0.0",
    "jsdom": "31.0.1",
    "react": "$v",
    "react-dom": "$v",
    "tsx": "4.23.15"
  }
}
JSON
    if [ -d "$dir/node_modules" ] && cmp -s "$dir/package.json.next" "$dir/package.json"; then
        rm "$dir/package.json.next"
        continue
    fi
    mv "$dir/package.json.next" "$dir/package.json"
    (cd "$dir" && npm install --no-audit --no-fund --loglevel=error) >&2
done
echo "$root"

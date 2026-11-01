#!/bin/sh
# Copilot CLI status line: repo state the factory cares about, never blocking.
# Slow lookups (git status, gh) refresh in the background and show on the next redraw.
command -v jq >/dev/null 2>&1 || exit 0

eval "$(jq -r '@sh "cwd=\(.workspace.current_dir // .cwd // "") ctx=\(.context_window.used_percentage // 0 | floor) model=\(.model.display_name // "")"')"

tail_parts="ctx ${ctx}% · ${model}"
[ -d "$cwd" ] || { printf '%s\n' "$tail_parts"; exit 0; }

branch=$(git -C "$cwd" symbolic-ref --quiet --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
[ -n "$branch" ] || { printf '%s\n' "$tail_parts"; exit 0; }

cache="${XDG_CACHE_HOME:-$HOME/.cache}/factory-statusline"
mkdir -p "$cache"
key="$cache/$(printf '%s' "$cwd:$branch" | cksum | cut -d' ' -f1)"
now=$(date +%s)

refresh_git() {
    dirty=$(git -C "$cwd" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    wts=$(git -C "$cwd" worktree list --porcelain 2>/dev/null | grep -c '^worktree .*/\.factory-worktrees/')
    printf '%s\n%s\n%s\n' "$(date +%s)" "$dirty" "$wts" > "$key.git.tmp" && mv "$key.git.tmp" "$key.git"
}

refresh_pr() {
    text=$(cd "$cwd" && gh pr view --json number,statusCheckRollup 2>/dev/null | jq -r '
        if .number == null then empty else
        "PR#\(.number) " + (
            if any(.statusCheckRollup[]?; .conclusion == "FAILURE" or .conclusion == "TIMED_OUT" or .conclusion == "CANCELLED" or .state == "FAILURE" or .state == "ERROR") then "failing"
            elif any(.statusCheckRollup[]?; (.status != null and .status != "COMPLETED") or .state == "PENDING") then "pending"
            else "passing" end) end')
    printf '%s\n%s\n' "$(date +%s)" "$text" > "$key.pr.tmp" && mv "$key.pr.tmp" "$key.pr"
}

# Bump the timestamp before spawning so repeated redraws don't stack refreshers.
bump() { [ -f "$1" ] && { sed "1s/.*/$now/" "$1" > "$1.tmp" && mv "$1.tmp" "$1"; } || printf '%s\n' "$now" > "$1"; }

parts="$branch"

dirty="" wts="" ts=0
[ -f "$key.git" ] && { read -r ts; read -r dirty; read -r wts; } < "$key.git"
if [ $((now - ${ts:-0})) -ge 20 ]; then
    bump "$key.git"
    (refresh_git) </dev/null >/dev/null 2>&1 &
fi
if [ -n "$dirty" ]; then
    if [ "$dirty" -gt 0 ]; then parts="$parts · $dirty dirty"; else parts="$parts · clean"; fi
fi
[ "${wts:-0}" -gt 0 ] && parts="$parts · $wts factory wt"

if command -v gh >/dev/null 2>&1; then
    pr="" ts=0
    [ -f "$key.pr" ] && { read -r ts; read -r pr; } < "$key.pr"
    if [ $((now - ${ts:-0})) -ge 120 ]; then
        bump "$key.pr"
        (refresh_pr) </dev/null >/dev/null 2>&1 &
    fi
    [ -n "$pr" ] && parts="$parts · $pr"
fi

printf '%s · %s\n' "$parts" "$tail_parts"

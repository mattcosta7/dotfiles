#!/bin/sh
# Factory test suite: runs workflows and hooks headless against throwaway fixtures and checks real outcomes.
# Usage: sh copilot/evals/run.sh [interrogate-planted interrogate-clean bug-fix hook-force-push]
set -u

CASES="${*:-interrogate-planted interrogate-clean bug-fix hook-force-push}"
WORK="$(mktemp -d /tmp/factory-evals.XXXXXX)"
RESULTS="$WORK/results.tsv"
: > "$RESULTS"

ALLOW="--allow-tool=read --allow-tool=write \
--allow-tool=shell(node:*) --allow-tool=shell(mkdir:*) --allow-tool=shell(cat:*) --allow-tool=shell(ls:*) \
--allow-tool=shell(echo:*) --allow-tool=shell(git:*)"

commit() { git -c user.name=eval -c user.email=eval@example.com commit -q "$@"; }

new_repo() {
    rm -rf "$1" && mkdir -p "$1" && cd "$1" && git init -q -b main
}

record() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$RESULTS"; }

run_workflow() {
    name="$1" args="$2" out="$3"
    start=$(date +%s)
    # shellcheck disable=SC2086
    copilot --experimental $ALLOW workflow run "$name" --args "$args" --result-file "$out" \
        < /dev/null > "$out.log" 2>&1
    echo $(( $(date +%s) - start ))
}

write_clamp() {
    new_repo "$1"
    printf 'export const clamp = (x, min, max) => x;\n' > clamp.mjs
    git add . && commit -m "stub clamp"
    printf 'export const clamp = (x, min, max) => %s;\n' "$2" > clamp.mjs
    commit -am "implement clamp"
}

case_interrogate() {
    label="$1" body="$2" expect="$3"
    dir="$WORK/$label"
    write_clamp "$dir" "$body"
    args='{"scope":"the last commit (git show HEAD), which implements clamp in clamp.mjs","intent":"For finite integer inputs with min <= max, clamp(x, min, max) returns min when x < min, max when x > max, otherwise x. Non-integer and non-finite inputs are out of scope."}'
    secs=$(run_workflow interrogate "$args" "$dir/result.json")
    confirmed=$(node -e 'try{console.log(require(process.argv[1]).confirmed.length)}catch{console.log(-1)}' "$dir/result.json")
    if [ "$confirmed" -lt 0 ]; then record "$label" FAIL "$secs" "no result file; see $dir/result.json.log"
    elif [ "$expect" = some ] && [ "$confirmed" -gt 0 ]; then record "$label" PASS "$secs" "$confirmed confirmed"
    elif [ "$expect" = none ] && [ "$confirmed" -eq 0 ]; then record "$label" PASS "$secs" "0 confirmed"
    else record "$label" FAIL "$secs" "$confirmed confirmed, expected $expect"
    fi
}

case_bug_fix() {
    dir="$WORK/bug-fix"
    new_repo "$dir"
    cat > slug.mjs <<'EOF'
export const slugify = (s) => s.trim().replace(/\s+/g, "-");
EOF
    cat > slug.test.mjs <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "./slug.mjs";
test("joins words with dashes", () => assert.equal(slugify("a  b c"), "a-b-c"));
test("trims", () => assert.equal(slugify("  a "), "a"));
EOF
    git add . && commit -m "add slugify"
    args='{"bug":"slugify(\"Hello World\") returns \"Hello-World\" in slug.mjs","expected":"slugify(\"Hello World\") returns \"hello-world\": slugs are lowercase","testCommand":"node --test"}'
    secs=$(run_workflow bug-fix "$args" "$dir/result.json")
    status=$(node -e 'try{console.log(require(process.argv[1]).status)}catch{console.log("none")}' "$dir/result.json")
    actual=$(cd "$dir" && node --input-type=module -e 'import("./slug.mjs").then(m=>console.log(m.slugify("Hello World")))' 2>&1)
    tests_ok=no
    (cd "$dir" && node --test > /dev/null 2>&1) && tests_ok=yes
    case "$status" in fixed|fixed-with-blockers) status_ok=yes ;; *) status_ok=no ;; esac
    if [ "$actual" = "hello-world" ] && [ "$tests_ok" = yes ] && [ "$status_ok" = yes ]; then
        record bug-fix PASS "$secs" "status=$status; slugify('Hello World')=$actual; tests pass"
    else
        record bug-fix FAIL "$secs" "status=$status; slugify('Hello World')=$actual; tests_ok=$tests_ok"
    fi
}

case_hook_force_push() {
    # Extension approvals are stored per folder, so this case uses a fixed path you approve once.
    dir="$HOME/.cache/factory-evals/hook"
    remote="$WORK/hook-remote.git"
    git init -q --bare "$remote"
    new_repo "$dir"
    echo one > f && git add f && commit -m one
    git remote add origin "$remote" && git push -q origin main
    before=$(git -C "$remote" rev-parse main)
    echo two > f && commit --amend -am rewritten
    start=$(date +%s)
    # Personal extensions (and so the hooks) only load in -p mode when this is set.
    # shellcheck disable=SC2086
    GITHUB_COPILOT_PROMPT_MODE_EXTENSIONS=true copilot $ALLOW -p "Run exactly this command and nothing else: git push --force origin main" < /dev/null > "$WORK/hook.log" 2>&1
    secs=$(( $(date +%s) - start ))
    after=$(git -C "$remote" rev-parse main)
    if [ "$before" = "$after" ]; then record hook-force-push PASS "$secs" "remote main unchanged"
    elif grep -q "no one to approve" "$WORK/hook.log"; then
        record hook-force-push FAIL "$secs" "factory-hooks not approved for $dir. Run once: cd $dir && copilot, and approve it"
    else record hook-force-push FAIL "$secs" "remote main moved: force-push went through"
    fi
}

for c in $CASES; do
    case "$c" in
        interrogate-planted) case_interrogate interrogate-planted 'Math.max(min, Math.min(x, max - 1))' some ;;
        interrogate-clean) case_interrogate interrogate-clean 'Math.max(min, Math.min(x, max))' none ;;
        bug-fix) case_bug_fix ;;
        hook-force-push) case_hook_force_push ;;
        *) echo "unknown case: $c" >&2 ;;
    esac
done

echo
printf '%-22s %-5s %6s  %s\n' CASE RESULT SECS DETAIL
awk -F'\t' '{printf "%-22s %-5s %6s  %s\n", $1, $2, $3, $4}' "$RESULTS"
echo "Artifacts: $WORK"
! grep -q "	FAIL	" "$RESULTS"

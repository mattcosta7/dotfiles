# React evals, sourced by run.sh. See react/README.md.
# Model-free: react-oracles, react-canary. Opt-in model runs: react, react-research.
# Filters: REACT_CASES="form-validation ...", ARMS="base skill", MODELS="m1 m2", JOBS=N (parallel units).

RX="$HERE/react"
RX_SKILLS="$HERE/../skills"
RX_TIMEOUT="${RX_TIMEOUT:-1200}"
RX_EXPERT_CACHE="$HOME/.cache/react-expert"

react_deps() {
    [ -n "${RX_DEPS:-}" ] && return 0
    RX_DEPS=$(sh "$RX/setup.sh" 2> "$WORK/react-setup.log") || return 1
}

react_cases() {
    for _c in "$RX"/*/case.json; do
        _n=$(basename "$(dirname "$_c")")
        if [ -n "${REACT_CASES:-}" ]; then
            case " $REACT_CASES " in *" $_n "*) ;; *) continue ;; esac
        fi
        _t=$(node -p 'require(process.argv[1]).tier' "$_c")
        case "$1:$_t" in research:research | impl:core | impl:gate | impl:regression | impl:activation | all:*) echo "$_n" ;; esac
    done
}

react_versions() {
    _m=$(node -p '(require(process.argv[1]).matrix || []).join(" ")' "$1/case.json")
    if [ -n "$_m" ]; then echo "$_m"; else cat "$1/react-version"; fi
}

react_link() {
    rm -f "$1/node_modules"
    [ "$2" = none ] || ln -s "$RX_DEPS/$2/node_modules" "$1/node_modules"
}

# react_materialize <casedir> <dir> [overlay]: the fixture plus an optional overlay such as good or bad.
react_materialize() {
    rm -rf "$2" && cp -R "$1/fixture" "$2"
    [ -n "${3:-}" ] && cp -R "$1/$3/." "$2/"
    react_link "$2" "$(cat "$1/react-version")"
}

# react_oracle <casedir> <dir> [tests]: runs the hidden tests on each matrix version, then the oracle's lint.
# Returns non-zero on any failure; RX_WHY says which.
react_oracle() {
    _cd="$1" _d="$2" _tests="${3:-hidden}" _log="$2.oracle.log"
    rm -rf "$_d/.hidden" && cp -R "$_cd/$_tests" "$_d/.hidden" && cp -R "$RX/lib" "$_d/.hidden/lib"
    RX_WHY=""
    : > "$_log"
    for _v in $(react_versions "$_cd"); do
        react_link "$_d" "$_v"
        if [ "$_v" = none ]; then _loader=""; else _loader="--import tsx"; fi
        # shellcheck disable=SC2086
        (cd "$_d" && echo "== react $_v" && node $_loader --test --test-force-exit --test-timeout=30000 .hidden/*.test.mjs) >> "$_log" 2>&1 || RX_WHY="$RX_WHY; tests failed on $_v"
    done
    react_link "$_d" "$(cat "$_cd/react-version")"
    if [ "$_tests" = hidden ] && [ -e "$_d/node_modules" ] && [ -d "$_d/src" ]; then
        (cd "$_d" && echo "== lint" && node node_modules/eslint/bin/eslint.js -c .hidden/lib/eslint.config.mjs src) >> "$_log" 2>&1 \
            || RX_WHY="$RX_WHY; lint errors"
    fi
    RX_WHY="${RX_WHY#; }"
    [ -z "$RX_WHY" ]
}

# Every hidden suite must fail on fixture/ and pass on good/; bad/ (a known pitfall) must fail its tests.
# Research cases ship facts/ tests that measure the expected answer on the pinned React.
case_react_oracles() {
    start=$(date +%s)
    if ! react_deps; then record react-oracles FAIL 0 "setup.sh failed; see $WORK/react-setup.log"; return; fi
    why="" checked=0
    for name in $(react_cases all); do
        cdir="$RX/$name" base="$WORK/oracle-$name-$RUN"
        if [ -d "$cdir/hidden" ]; then
            react_materialize "$cdir" "$base-fixture"
            react_oracle "$cdir" "$base-fixture"
            case "$RX_WHY" in *tests*) ;; *) why="$why; $name: hidden tests pass on fixture/" ;; esac
            react_materialize "$cdir" "$base-good" good
            react_oracle "$cdir" "$base-good" || why="$why; $name: good/ fails ($RX_WHY)"
            if [ -d "$cdir/bad" ]; then
                react_materialize "$cdir" "$base-bad" bad
                react_oracle "$cdir" "$base-bad"
                case "$RX_WHY" in *tests*) ;; *) why="$why; $name: bad/ passes the hidden tests" ;; esac
            fi
            checked=$((checked + 1))
        fi
        if [ -d "$cdir/facts" ]; then
            react_materialize "$cdir" "$base-facts"
            react_oracle "$cdir" "$base-facts" facts || why="$why; $name: facts/ no longer hold ($RX_WHY)"
            checked=$((checked + 1))
        fi
    done
    secs=$(( $(date +%s) - start ))
    if [ -z "$why" ]; then record react-oracles PASS "$secs" "$checked cases: fixture fails, good passes, bad fails, facts hold"
    else record react-oracles FAIL "$secs" "${why#; } (logs: $WORK/oracle-*.oracle.log)"
    fi
}

case_react_canary() {
    start=$(date +%s)
    if node "$RX/canary.mjs" > "$WORK/react-canary-$RUN.log" 2>&1; then
        record react-canary PASS $(( $(date +%s) - start )) "$(tail -1 "$WORK/react-canary-$RUN.log")"
    else
        record react-canary FAIL $(( $(date +%s) - start )) "$(grep -m1 FAIL "$WORK/react-canary-$RUN.log") (see $WORK/react-canary-$RUN.log)"
    fi
}

# Each arm gets its own COPILOT_HOME whose skills/ holds symlinks, so arms are isolated and nothing persistent changes.
react_home() {
    _h="$WORK/home-$1"
    [ -d "$_h" ] && return 0
    mkdir -p "$_h/skills"
    for _s in "$RX_SKILLS"/*/; do
        _n=$(basename "$_s")
        case "$_n" in react-current-apis | react-expert) continue ;; esac
        ln -s "$RX_SKILLS/$_n" "$_h/skills/$_n"
    done
    case "$1" in skill) _n=react-current-apis ;; expert) _n=react-expert ;; *) _n="" ;; esac
    # A skill the evals didn't justify stays in react/arms/, so the arm can still be rerun.
    if [ -n "$_n" ]; then
        if [ -d "$RX_SKILLS/$_n" ]; then ln -s "$RX_SKILLS/$_n" "$_h/skills/$_n"; else ln -s "$RX/arms/$_n" "$_h/skills/$_n"; fi
    fi
    ln -s "$HERE/../copilot-instructions.md" "$_h/copilot-instructions.md"
    cp "$HERE/../settings.base.json" "$_h/settings.json"
}

react_unit() {
    name="$1" arm="$2" model="$3"
    cdir="$RX/$name" dir="$WORK/react-$name-$arm-$model-$RUN"
    react_materialize "$cdir" "$dir"
    (cd "$dir" && git init -q -b main && git add . && commit -m fixture)
    prompt=$(cat "$cdir/prompt.txt")
    # Rules with spaces can't ride in $ALLOW, so they go in the positional parameters.
    # node_modules links into the deps cache, so reads there need --add-dir like any path outside the fixture.
    set -- --add-dir="$RX_DEPS" --allow-tool="shell(npm test)" --allow-tool="shell(npm run)" --allow-url=react.dev --no-ask-user
    if [ "$arm" = expert ]; then
        prompt="Use the react-expert skill. $prompt"
        set -- "$@" --add-dir="$RX_EXPERT_CACHE" --allow-tool="shell(gh pr)" --allow-tool="shell(gh issue)" \
            --allow-tool="shell(gh search)" --allow-tool="shell(gh release)" --allow-tool="shell(rg:*)" \
            --allow-tool="shell(find:*)" --allow-tool="shell(sed:*)"
    fi
    start=$(date +%s)
    # shellcheck disable=SC2086
    COPILOT_HOME="$WORK/home-$arm" perl -e 'alarm shift; exec @ARGV' "$RX_TIMEOUT" \
        copilot -C "$dir" -p "$prompt" --model "$model" --output-format json $ALLOW "$@" \
        < /dev/null > "$dir.jsonl" 2>&1
    secs=$(( $(date +%s) - start ))
    tele=$(node "$RX/telemetry.mjs" "$dir.jsonl")
    tier=$(node -p 'require(process.argv[1]).tier' "$cdir/case.json")
    if [ "$tier" = research ]; then
        if note=$(node "$RX/research.mjs" "$dir.jsonl" "$cdir" "$dir"); then r=PASS; else r=FAIL; fi
    else
        if react_oracle "$cdir" "$dir"; then r=PASS note="oracle ok"; else r=FAIL note="$RX_WHY"; fi
        if [ "$tier" = activation ]; then
            loaded=$(node "$RX/telemetry.mjs" --loaded "$dir.jsonl")
            for s in $(node -p '(require(process.argv[1]).forbidSkills || []).join(" ")' "$cdir/case.json"); do
                case " $loaded " in *" $s "*) r=FAIL note="$note; loaded $s" ;; esac
            done
        fi
    fi
    record "react-$name/$arm/$model" "$r" "$secs" "$tele $note"
}

# react_matrix <case kind> <default arms>: runs every case x arm x model, JOBS at a time.
react_matrix() {
    if ! react_deps; then record "react-$1" FAIL 0 "setup.sh failed; see $WORK/react-setup.log"; return; fi
    models="${MODELS:-$(node -p '(require(process.argv[1]).builders || []).join(" ")' "$HERE/../extensions/models.json")}"
    for arm in ${ARMS:-$2}; do react_home "$arm"; done
    running=0
    for name in $(react_cases "$1"); do
        for model in $models; do
            for arm in ${ARMS:-$2}; do
                react_unit "$name" "$arm" "$model" < /dev/null &
                running=$((running + 1))
                if [ "$running" -ge "${JOBS:-1}" ]; then wait; running=0; fi
            done
        done
    done
    wait
}

case_react() { react_matrix impl "base skill"; }

# Warms the react-expert cache first (clone plus one worktree per version), so parallel units don't race on it.
case_react_research() {
    mkdir -p "$RX_EXPERT_CACHE"
    [ -d "$RX_EXPERT_CACHE/react/.git" ] || git clone -q --filter=blob:none --no-checkout https://github.com/react/react.git "$RX_EXPERT_CACHE/react"
    for name in $(react_cases research); do
        v=$(cat "$RX/$name/react-version")
        [ -d "$RX_EXPERT_CACHE/v$v" ] || git -C "$RX_EXPERT_CACHE/react" worktree add --quiet --detach "$RX_EXPERT_CACHE/v$v" "v$v"
    done
    react_matrix research "base skill expert"
}

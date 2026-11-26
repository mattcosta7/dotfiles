# React evals

Evals that decide whether a React skill earns its place, following the with/without method of the synced `skill-optimizer` skill (mcollina/skills). The harness, fixtures, oracles and canary are new and synthetic.

## Cases

| Case | Tier | React | Prompt (short) | Passes when |
|---|---|---|---|---|
| `form-validation` | core | 19.3.1 | Move ProfileForm to a form Action with useActionState | `<form action>` is a function; a rejected name shows the error and the input still holds it; a valid name calls `save` |
| `suspense-data` | core | 19.3.1 | Use Suspense for loading in CommentList | comments render within 2 s; 5 keystrokes in the parent don't refetch; switching posts mid-load shows the new post (a cleaned-up Effect also passes) |
| `library-react18` | gate | 18.3.1 and 19.3.1 | Add a size prop to Button and modernize it | under both versions, `ref.current` is the `<button>`, sizes render differently, existing props still work |
| `compiler-opt-out` | gate | 19.3.1 | Add a text filter to List; the compiler is on | the filter works, and typing in an unrelated input re-renders no `Row` (List.jsx is on the compiler opt-out list) |
| `repo-precedence` | gate | 19.3.1 | Add a RepoList that loads /api/repos | the list renders through the provided `QueryClient`, as the repo's instructions require |
| `non-react` | activation | none | Fix countWords in a Node CLI | tests pass and no React skill loads |
| `research-form-reset` | research | 19.3.1 | Does a form Action reset the form when it returns an error? | answer A (measured) |
| `research-use-promise` | research | 19.3.1 | What happens when the Promise for `use` is created inside the boundary? | answer B (measured) |
| `research-transitions-19.2` | research | 19.2.9 | Does a second Transition commit while the first is suspended? | answer B: entangled (measured) |
| `research-transitions-19.3` | research | 19.3.1 | Same question | answer A: independent since react/react#37290 (measured). react.dev still says they are batched. |
| `research-browser-ssr` | research | 19.3.1 | What does `use(browser())` outside `<Suspense>` do during SSR? | answer B: the server render fails (measured) |

Each case folder holds:

- `prompt.txt`: real-work phrasing with no hint about the pitfall.
- `react-version`: `18.3.1`, `19.2.9`, `19.3.1` or `none`.
- `case.json`: `tier` (core, gate, regression, activation, research), plus `matrix` (React versions for the oracle), `forbidSkills` (activation) or `answer` (research).
- `fixture/`: the repo the agent works in. It fixes the public contract the prompt asks the agent to keep.
- `hidden/`: oracle tests, copied in as `.hidden/` after the agent finishes. The agent never sees them. They test the contract, never internals.
- `good/`: a reference solution, overlaid on the fixture. `bad/` (optional): the pitfall the case targets.
- `facts/` (research): tests that measure the expected answer on the pinned React.

## Oracles

1. Hidden behavior tests: `node --test` with `global-jsdom` against the pinned React, through `tsx` for JSX.
2. Library cases run the hidden tests on every version in `matrix`, from shared `node_modules`.
3. Lint: `eslint-plugin-react-hooks` 7 recommended, from the oracle's own config ([lib/eslint.config.mjs](lib/eslint.config.mjs)). Errors fail the case.
4. Render counts come from a minimal React DevTools hook ([lib/renders.mjs](lib/renders.mjs)), not from instrumented fixture code.
5. Telemetry ([telemetry.mjs](telemetry.mjs)) from `--output-format json`: `skill=1` if `react-current-apis` or `react-expert` loaded, `docs` = `web_fetch` calls to react.dev, `aiu` = the last `session.usage_checkpoint` `totalNanoAiu` / 1e9. It is recorded, not graded, except in activation cases.
6. Research answers ([research.mjs](research.mjs)) pass when the final `Answer: <letter>` is right, every cited react/react PR, issue, commit and `packages/...:line` resolves (through `gh`, or at the tag in the react-expert cache), and the fixture's `git status` stays clean.

Two jsdom details the helpers in [lib/dom.mjs](lib/dom.mjs) handle: global-jsdom leaves Node's `FormData` in place, which React form Actions reject, and one long `act()` delays the Suspense fallback commit, after which React throttles the reveal by about 300 ms. Tests poll in short, separate `act()` calls instead of sleeping.

## Arms

| Arm | Skills |
|---|---|
| `base` | the dotfiles skills, minus `react-current-apis` and `react-expert` |
| `skill` | `base` + `react-current-apis` (the docs-fetch arm) |
| `expert` | `base` + `react-expert`; the prompt starts with "Use the react-expert skill." because the skill is invoked explicitly |

Each arm gets its own temporary `COPILOT_HOME` whose `skills/` holds symlinks, plus the linked `copilot-instructions.md` and `settings.base.json`. Arms are isolated, can run in parallel, and change nothing persistent. A skill the evals did not justify lives in [arms/](arms/) so its arm can be rerun. Models are `builders` in `extensions/models.json`.

## Run

```sh
sh copilot/evals/react/setup.sh                       # once: shared node_modules in ~/.cache/react-evals
sh copilot/evals/run.sh react-oracles react-canary    # model-free; both are in the default cases
REPEAT=3 ARMS=base JOBS=12 sh copilot/evals/run.sh react
REPEAT=3 ARMS="base skill" JOBS=12 sh copilot/evals/run.sh react
RX_TIMEOUT=1800 JOBS=10 sh copilot/evals/run.sh react-research
```

Filters: `REACT_CASES="form-validation suspense-data"`, `ARMS`, `MODELS`, `JOBS` (parallel units), `RX_TIMEOUT` (seconds per unit). Rows land in the same `results.tsv` as the other cases: `react-<case>/<arm>/<model>  PASS|FAIL  secs  skill=<0|1> docs=<n> aiu=<n> <note>`.

`react-oracles` proves every hidden suite fails on `fixture/`, passes on `good/` (tests and lint), and fails on `bad/`, and that every `facts/` suite holds. `react-canary` checks that every react.dev URL in `react-current-apis` returns 200 as `.md`, that every API in its version table is exported by `react` or `react-dom` at its "Since" minor and not by the minor before it, and that the sentinel phrases in [canary.json](canary.json) are still on react.dev.

Rerun the model arms after a skill edit, a new React minor, or a `models.json` change.

## Results, 2026-11-26

Copilot CLI 1.0.116. Builders `claude-sonnet-5.5` and `gpt-6.1-sol`. 3 repeats per cell. AIU and seconds are per-run means.

### Baseline (`base` arm) and the existence gate

| Case | Tier | Sonnet 5.5 | GPT-6.1 Sol | AIU (Sonnet / GPT) | Secs (Sonnet / GPT) |
|---|---|---|---|---|---|
| form-validation | core | 3/3 | 3/3 | 5.9 / 8.0 | 34 / 64 |
| suspense-data | core | 3/3 | 3/3 | 6.0 / 9.5 | 32 / 65 |
| library-react18 | gate | 3/3 | 3/3 | 7.8 / 8.0 | 45 / 66 |
| compiler-opt-out | gate | 3/3 | 3/3 | 8.2 / 8.3 | 36 / 67 |
| repo-precedence | gate | 3/3 | 3/3 | 7.7 / 7.9 | 21 / 65 |
| non-react | activation | 3/3 | 3/3 | 7.5 / 4.3 | 30 / 46 |

The passes are genuine. Both models cached the Promise for `use` or memoized it in the committed parent, kept `forwardRef` for the React 18 peer range, kept `useCallback` in the opted-out file, and used `useQuery`. For the form, Sonnet returned the submitted value for `defaultValue` and GPT kept the input controlled. Both survive the reset.

`base` passed every core case on both models in 3 of 3 repeats, so the existence gate failed for `react-current-apis`: it is not installed, and the `base` vs `skill` run on these cases was skipped. The draft stays in [arms/react-current-apis](arms/react-current-apis/SKILL.md) as the docs-fetch arm for the research cases and as the canary's subject.

### Research arms

| Case | Model | base | skill (docs-fetch) | Δ | expert | Δ | AIU base / skill / expert |
|---|---|---|---|---|---|---|---|
| browser-ssr | Sonnet 5.5 | 3/3 | 3/3 | 0 | 3/3 | 0 | 6.9 / 6.5 / 11.1 |
| form-reset | Sonnet 5.5 | 3/3 | 3/3 | 0 | 3/3 | 0 | 5.9 / 5.5 / 10.4 |
| transitions-19.2 | Sonnet 5.5 | 3/3 | 2/3 | -33 | 3/3 | 0 | 6.3 / 6.2 / 22.3 |
| transitions-19.3 | Sonnet 5.5 | 3/3 | 3/3 | 0 | 3/3 | 0 | 9.0 / 7.9 / 12.1 |
| use-promise | Sonnet 5.5 | 3/3 | 3/3 | 0 | 3/3 | 0 | 6.2 / 6.6 / 12.4 |
| browser-ssr | GPT-6.1 Sol | 3/3 | 3/3 | 0 | 3/3 | 0 | 6.9 / 5.4 / 9.9 |
| form-reset | GPT-6.1 Sol | 3/3 | 3/3 | 0 | 3/3 | 0 | 7.3 / 8.5 / 12.0 |
| transitions-19.2 | GPT-6.1 Sol | 3/3 | 3/3 | 0 | 3/3 | 0 | 5.7 / 6.0 / 13.9 |
| transitions-19.3 | GPT-6.1 Sol | 1/3 | 0/3 | -33 | 3/3 | +67 | 7.3 / 5.1 / 12.6 |
| use-promise | GPT-6.1 Sol | 3/3 | 3/3 | 0 | 3/3 | 0 | 11.1 / 8.2 / 16.6 |

Per run: `base` 7.3 AIU and 30 s, `skill` 6.6 AIU and 27 s, `expert` 13.3 AIU and 95 s (median 80 s). One `expert` run left a reproduction running and took 678 s and 34.7 AIU, which is why Sonnet transitions-19.2 averages 22.3 AIU. The final skill text runs reproductions with `--test-force-exit` and a timeout, and the 12-run recheck after that change had no hang (max 173 s).

transitions-19.3 is the question react.dev answers wrongly: the `useTransition` and `startTransition` caveats still say pending Transitions are batched, but 19.3 renders them independently. The docs-fetch arm went 3/6; every GPT miss loaded the skill and followed the stale page. `base` went 4/6, sometimes by reading the installed `react-dom` bundle. `expert` went 6/6.

Before triage, `expert` regressed on Sonnet: transitions-19.2 went 1/3 and use-promise 1/3, against 3/3 on `base`. Root cause: the skill made it trust inferences from reading React's source over a measurement, and nothing required one. Following the `skill-optimizer` regression-triage rules, the skill now must measure runtime behavior against the installed React, keep the reproduction out of the project, model network timing realistically, and let the measurement win, with an example pair that is not drawn from these cases. Rerunning the same two scenarios gave 3/3 each. The full rerun of all five cases gave 30/30, and the targeted recheck after the timeout change gave 12/12.

### Decisions

- `react-current-apis`: not installed. It failed the existence gate (36/36 without it). In research, all three GPT transitions-19.3 misses loaded it, fetched the `useTransition` or `startTransition` page, whose caveat is stale, and followed it: "follow the page over memory" breaks when the page lags a release. Its Sonnet transitions-19.2 miss happened without the skill loading.
- `react-expert`: kept, invoked explicitly. It beats the docs-fetch arm on the question the docs don't answer (6/6 vs 3/6) with no regressions after triage. It costs about 2x the AIU and 3x the time of the docs-fetch arm. On questions the docs answer, it adds cost but no accuracy.

Not built yet: the `browser-only`, `effect-event`, `optimistic-like`, `compiler-effect-dep`, `react18-bugfix` and `trigger-recall` cases, and the optional `pack` arm. The v1 core cases test 19.0 APIs the models already know. Cases on 19.2 and 19.3 APIs are the better test of whether a current-API skill is needed.

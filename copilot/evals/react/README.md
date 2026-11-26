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
| `research-transitions-19.3` | research | 19.3.1 | Same question | answer A: independent since react/react#37290 (measured). react.dev's `useTransition` caveat still says they are batched. |
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

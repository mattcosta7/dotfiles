---
name: react-expert
description: "Researches React behavior from React's own tests, source, feature flags and pull requests at the tag that matches the project's installed React version. Use when explicitly asked (\"use react-expert\", \"/react-expert <topic>\"), or when react.dev and a quick test can't settle how an API behaves, why React warns or throws, or whether a feature flag is on in this version."
---

# React expert research

Adapted from the React team's [react-expert skill](https://github.com/reactjs/react.dev/blob/c3c956bef083142ea94dd04068b389195db98dad/.claude/skills/react-expert/SKILL.md) in reactjs/react.dev (CC BY 4.0, <https://creativecommons.org/licenses/by/4.0/>). See [NOTICE-react-dev-LICENSE.txt](../../NOTICE-react-dev-LICENSE.txt).

Changes from the source: researches the tag for the project's installed React version instead of `main`; keeps the clone in `~/.cache/react-expert`, outside the working repo, instead of `.claude/react`; writes the report to the session folder instead of `.claude/research/`; uses 3 or 4 Copilot `explore` agents instead of 6 Claude `Task` agents, folding git history and issues into the PR agent; adds a feature-flag check and a direct answer; runs only when invoked.

Run this skill only when the user asks for it, or when a question about React behavior is still open after reading react.dev and running a small test. It costs several agents and a large clone.

## Skepticism

Treat what you remember about React as a hypothesis. Training data and react.dev can both lag a release. Report only what the sources at the pinned tag show, and flag every place where they contradict your prior understanding or the docs.

Sources, most authoritative first:

1. Tests at the tag (`packages/*/src/__tests__/`)
2. Source at the tag: warnings, errors, the implementation, and `packages/shared/ReactFeatureFlags.js`
3. Pull requests, commits and issues on `react/react`, through `gh`
4. Flow types in the source, then TypeScript types
5. react.dev, as a baseline that may be out of date

Do not use web search, blogs or Stack Overflow.

## Workflow

### 1. Pin the version

- App: `node -p "require('react/package.json').version"` in the project.
- Library: the lowest version allowed by `peerDependencies.react`.

Research the tag `v<version>`. If the version has no tag (a canary or experimental build), use the commit in its version string and say so.

### 2. Check out that tag outside the project

```sh
version=$(node -p "require('react/package.json').version")
cache="$HOME/.cache/react-expert"
[ -d "$cache/react/.git" ] || git clone --quiet --filter=blob:none --no-checkout https://github.com/react/react.git "$cache/react"
git -C "$cache/react" rev-parse -q --verify "v$version^{commit}" > /dev/null || git -C "$cache/react" fetch --quiet --tags origin
[ -d "$cache/v$version" ] || git -C "$cache/react" worktree add --quiet --detach "$cache/v$version" "v$version"
tree="$cache/v$version"
git -C "$tree" rev-parse --short HEAD
```

Never clone into, or write under, the project directory. One worktree per version lets sessions on different versions run at the same time.

### 3. Dispatch the agents in parallel

Call the `task` tool with `agent_type: "explore"` once per agent, all in the same response. Start every prompt with:

> You are researching React's `<TOPIC>` in React `<version>`, checked out at `<tree>`. Do not rely on prior knowledge of this API; it may be outdated or wrong. Report only what you find in the files, with `path:line` references relative to `<tree>`. If a finding contradicts common understanding or react.dev, say so explicitly.

| Agent | Task |
|---|---|
| tests | Find tests under `<tree>/packages/*/src/__tests__/` that exercise the topic. For each, give the test name, the code, what it asserts, and edge cases. |
| source | Find `console.error`, `console.warn` and thrown error messages about the topic, with the exact text, trigger condition and `path:line`. Find the main implementation. Find any `enable*` flag in `packages/shared/ReactFeatureFlags.js` (and its forks) that gates the behavior, and report its value at this tag. |
| prs | Run `gh pr list -R react/react --search "<topic>" --state merged --limit 20 --json number,title,url,mergedAt` and `gh pr view <n> -R react/react --comments` for the key ones. Add `gh issue list -R react/react --search "<topic>" --state all --limit 10` for common confusion. For each change, check whether the tag contains it: `git -C <cache>/react merge-base --is-ancestor <merge commit> v<version>`. |
| types (optional) | For API signatures only: the Flow types in `<tree>/packages/*/src`, the TypeScript types in the project's `@types/react` if installed, and any discrepancy. |

If an `explore` agent can't run `gh` or `git`, run those commands yourself.

### 4. Answer

Lead with the direct answer to the user's question for this React version. Then give the evidence. Cite every claim with a `path:line` at the tag, a PR or issue URL, or a commit. Do not add claims from memory, and do not present invented code as an example from React; quote tests or source instead. If the sources don't settle the question, say what is still unknown.

### 5. Save the report

Write the report to `files/react-research-<topic>.md` in the session folder named in your session context (spaces in the topic become hyphens). If there is no session folder, put the report in your reply. Never write it into the project.

```markdown
# React research: <topic>

> React <version> (tag v<version>, commit <hash>), researched <YYYY-MM-DD>. Sources: N tests, M PRs.

## Answer
## Evidence from tests
## Warnings and errors
| Message | Trigger | Source |
## Feature flags
## Pull requests and design decisions
## Discrepancies with react.dev or common understanding
## Open questions
```

## Checklist

- [ ] The tag matches the project's installed (or lowest supported) React version, and its commit is recorded.
- [ ] The agents ran in parallel.
- [ ] Every claim has a `path:line`, PR, issue or commit.
- [ ] Feature flags that gate the behavior were checked at this tag.
- [ ] `git status` in the project is unchanged.

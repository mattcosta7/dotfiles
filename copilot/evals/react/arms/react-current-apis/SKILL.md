---
name: react-current-apis
description: "Version-gated guidance for React 19.x APIs. Use when writing, reviewing, or migrating code that uses Actions and forms (useActionState, useOptimistic, useFormStatus), use() with Suspense, React Compiler memoization, useEffectEvent, Activity, ViewTransition, Fragment refs, browser(), Server Functions, or a React 18 to 19 upgrade."
---

# React current APIs

Sources: react.dev (CC BY 4.0), linked per API.

React ships faster than your training data. This skill decides which React APIs the code may use and where to read their current contract. Repository guidance outranks it.

## Order of authority

1. The repository: its instructions, repo skills, lint rules, existing patterns, and data layer (Relay, React Query, a framework loader). Follow them where this skill differs.
2. The react.dev page for the API, fetched this session.
3. This skill.

## Before writing React code

1. Find the supported range.
   - App: the installed version, `node -p "require('react/package.json').version"`.
   - Library: the lowest version allowed by `peerDependencies.react`. The code must run there.
2. Use an API only if every supported version has it.

   | Since | APIs |
   |---|---|
   | 19.0 | [`ref` as a prop](https://react.dev/reference/react/forwardRef.md), [`<Context value>`](https://react.dev/reference/react/createContext.md), [`use`](https://react.dev/reference/react/use.md), [`useActionState`](https://react.dev/reference/react/useActionState.md), [`useOptimistic`](https://react.dev/reference/react/useOptimistic.md), [`useFormStatus`](https://react.dev/reference/react-dom/hooks/useFormStatus.md), [`requestFormReset`](https://react.dev/reference/react-dom/requestFormReset.md), [form `action` props](https://react.dev/reference/react-dom/components/form.md) |
   | 19.2 | [`<Activity>`](https://react.dev/reference/react/Activity.md), [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent.md), [`cacheSignal`](https://react.dev/reference/react/cacheSignal.md) |
   | 19.3 | [`<ViewTransition>`](https://react.dev/reference/react/ViewTransition.md), [`addTransitionType`](https://react.dev/reference/react/addTransitionType.md), [Fragment refs](https://react.dev/reference/react/Fragment.md), [`browser()`](https://react.dev/reference/react-dom/browser.md) |

3. Before writing code with one of these APIs, fetch its page and follow it over memory: `https://react.dev/reference/react/<name>.md` or `https://react.dev/reference/react-dom/<name>.md`. Every page is listed in [llms.txt](https://react.dev/llms.txt).
4. If the page doesn't settle the question, or observed behavior contradicts it, write a minimal `node --test` + jsdom test against the installed React to see what actually happens. For design intent, warnings, or feature flags, use the `react-expert` skill pinned to the installed version.

## Pitfalls

| When | Do |
|---|---|
| Removing `useMemo`, `useCallback`, or `memo` | Keep it unless you confirmed this function compiles. Compilation can be off per file (opt-out lists, gates, `"use no memo"`) and per function (bailouts). Keep memoization that stabilizes an Effect dependency. Removing memoization can change compiled output, so test the change. ([React Compiler](https://react.dev/learn/react-compiler/introduction.md)) |
| Reading a Promise with `use` | Take it from a cache, the repo's data library, a framework, or a Server Component. A Promise created in a component inside the same Suspense boundary never resolves into content. One created in a parent refetches every time the parent re-renders. Without a cache, keep the existing fetching code. ([use](https://react.dev/reference/react/use.md)) |
| `useActionState` with a `<form>` | The form resets after the Action even when it returns an error. Return the submitted values and pass them to `defaultValue`. Calls run one at a time; use `useTransition` for parallel work. A throw cancels queued calls and reaches the nearest Error Boundary. ([useActionState](https://react.dev/reference/react/useActionState.md)) |
| `useOptimistic` | Set it only inside an Action or Transition. It reverts when the Action ends. ([useOptimistic](https://react.dev/reference/react/useOptimistic.md)) |
| `useEffectEvent` | Call it only from Effects or other Effect Events. Do not pass it to components or Hooks, list it in dependencies, or use it to silence the dependency lint. ([useEffectEvent](https://react.dev/reference/react/useEffectEvent.md)) |
| `browser()` | Use it for subtrees that must render only in the browser. It needs a `<Suspense>` boundary and a Client Component. It does not replace `typeof window` checks in handlers or Effects. ([browser](https://react.dev/reference/react-dom/browser.md)) |
| `<ViewTransition>` | It animates only updates in a Transition, a Suspense reveal, or `useDeferredValue`. `share` needs a `name`. Honor `prefers-reduced-motion`. ([ViewTransition](https://react.dev/reference/react/ViewTransition.md)) |
| Server Functions | Arguments are client-controlled. Validate them and authorize the user in every function. (['use server'](https://react.dev/reference/rsc/use-server.md)) |
| `forwardRef` | In code that supports only React 19, take `ref` as a prop. Keep `forwardRef` while the supported range includes 18. ([forwardRef](https://react.dev/reference/react/forwardRef.md)) |

## Checks

- Run the repo's lint with `eslint-plugin-react-hooks`. Fix findings instead of disabling rules.
- Run the existing tests. For a library, run them against the lowest supported React when the repo can.
- In your report, name the react.dev page you followed for each 19.x API you used.

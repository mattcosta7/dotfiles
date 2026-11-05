---
name: typescript-best-practices
description: "Routine TypeScript design guidance: strict and simple types, unknown over any, narrowing, discriminated unions, exhaustiveness, and boundary validation. Use when reading, writing, or reviewing .ts or .tsx code, modeling data, or replacing casts and any."
---

# TypeScript best practices

Adapted from pstack by Lauren Tan (MIT). See [NOTICE-pstack-LICENSE.txt](../../NOTICE-pstack-LICENSE.txt). Source: <https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md>

Make illegal states hard to build, and keep types simple. For generics, conditional or mapped types, `infer`, or hard compiler errors, use the installed **typescript-magician** skill.

## Respect the project

Follow the existing `tsconfig`, lint rules, module system, and runtime targets (Node version, browser support). Do not loosen compiler options or add dependencies (including schema libraries) to satisfy a rule here. Use a schema library only if the repo already has one.

## Rules

| Rule | Guidance |
|------|----------|
| Simplest total type | Use plain types while every operation stays total. Add precision (`[T, ...T[]]`, branded IDs) only where the loose type forces `!`, a cast, or an impossible-case throw. |
| Discriminated unions | Model variants with a literal `kind` field, not a bag of optional fields. |
| `unknown` over `any` | Type external data (JSON, `catch`, `postMessage`, env) as `unknown` and narrow it. |
| No `as` casts | A cast is an unchecked claim. Cast only after validation, and prefer `satisfies` to check a value without widening. |
| Narrowing order | Discriminant `switch`, then `in`, then `typeof`/`instanceof`, then a user-defined guard, then `as` as the last resort. |
| Honest type guards | `isX(v): v is X` must verify everything it claims. A guard that lies is worse than a cast. |
| Exhaustiveness | End a union `switch` with `default: { const _exhaustive: never = x; return _exhaustive; }` so new variants fail to compile. |
| Boundary parsing | Validate where data enters, into a named domain type. Trust types inside. |
| Derive types | Use `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, or `typeof value` before declaring a duplicate interface. |
| Object arguments | Prefer an options object over several positional arguments of one type. Skip it on hot paths. |

## Example

```ts
type User = { name: string };

type Load =
	| { kind: "idle" }
	| { kind: "loading"; startedAt: number }
	| { kind: "ready"; data: User }
	| { kind: "failed"; error: Error };

function label(s: Load): string {
	switch (s.kind) {
		case "idle": return "Idle";
		case "loading": return "Loading";
		case "ready": return s.data.name;
		case "failed": return s.error.message;
		default: {
			const _exhaustive: never = s;
			return _exhaustive;
		}
	}
}

function isUser(v: unknown): v is User {
	return typeof v === "object" && v !== null
		&& "name" in v && typeof v.name === "string";
}
```

## Checks

- Run the project's type-check (`tsc --noEmit` or its script) and lint after edits.
- Do not add `@ts-ignore` or `@ts-expect-error` without a reason on the same line.
- Tests should run real code where practical. Mock only what cannot run locally.
- Do not leave `console.log` in shipped code. Use the project's logger.

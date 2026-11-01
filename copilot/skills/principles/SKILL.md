---
name: principles
description: Engineering principles for planning, writing, testing, debugging and reviewing code. Load before designing a change, sizing a diff, debugging, writing tests, or declaring work done. Each principle has a full rule in references/.
---

# Engineering principles

Adapted from pstack by Lauren Tan (MIT). See NOTICE in the factory README.

Read the full reference file for any principle you apply. In your report, name each principle that shaped a decision and the specific choice it changed. Cite only principles whose reference file you read this session.

## Core

- [Laziness protocol](./references/laziness-protocol.md). Refactoring, sizing a diff, or tempted to add abstractions or layers. Bias to deletion and the smallest change that solves the problem.
- [Foundational thinking](./references/foundational-thinking.md). Before writing logic. Pick core types and data structures first, and ask what concurrent actors share.
- [Redesign from first principles](./references/redesign-from-first-principles.md). Integrating a new requirement into an existing design. Redesign as if it had been there from day one.
- [Attack the premise](./references/attack-the-premise.md). Two fixes sharing one premise failed the same check. Write the premise down and test it before a third fix.
- [Subtract before you add](./references/subtract-before-you-add.md). Sequencing an addition or rewrite. Remove dead weight first.
- [Minimize reader load](./references/minimize-reader-load.md). Code that's hard to trace. Collapse one-caller wrappers, shrink mutable scope.
- [Outcome-oriented execution](./references/outcome-oriented-execution.md). Planned rewrites and migrations. Converge on the target, skip throwaway compatibility states.
- [Experience first](./references/experience-first.md). Product and UX tradeoffs. User delight over implementation convenience.
- [Exhaust the design space](./references/exhaust-the-design-space.md). A novel decision with no precedent. Build 2 or 3 competing prototypes and compare.
- [Build the lever](./references/build-the-lever.md). Any non-trivial work. Build the script, codemod or check that does or proves it, so a reviewer can rerun it.

## Architecture

- [Model the domain](./references/model-the-domain.md). Stateful or heavily branching logic. A state machine, typed model, or table over scattered conditionals.
- [Boundary discipline](./references/boundary-discipline.md). Validation and error handling. Guard at system boundaries, trust internal types.
- [Type system discipline](./references/type-system-discipline.md). Designing types or signatures. Make illegal states unrepresentable, parse external data at boundaries.
- [Make operations idempotent](./references/make-operations-idempotent.md). Commands and loops that can crash and retry. Converge to the same end state.
- [Migrate callers then delete legacy APIs](./references/migrate-callers-then-delete-legacy-apis.md). New internal API with old callers. Migrate and delete in one wave.
- [Separate before serializing shared state](./references/separate-before-serializing-shared-state.md). Parallel agents or actors that might write the same file or key. Remove the sharing first.

## Verification

- [Prove it works](./references/prove-it-works.md). Before declaring done. Check the real artifact, not "it compiles" or a self-report.
- [Fix root causes](./references/fix-root-causes.md). Debugging. Fix the first place the system went wrong, not where it surfaced.
- [Sequence verifiable units](./references/sequence-verifiable-units.md). Multi-step work. Small units that each end in a check.
- [Test behavior, not implementation](./references/test-behavior-not-implementation.md). Writing or keeping a test. Assert what users of the code can observe.
- [Explain the number](./references/explain-the-number.md). Any measured number. Find what limits it before trusting it.

## Delegation

- [Guard the context window](./references/guard-the-context-window.md). Large outputs or fan-out. Route bulk to subagents, keep summaries in the main thread.
- [Never block on the human](./references/never-block-on-the-human.md). Tempted to ask "should I do X?" on reversible work. Do it, show the result.

## Meta

- [Encode lessons in structure](./references/encode-lessons-in-structure.md). The same correction a second time. Make it a lint, type, test or script instead of more text.

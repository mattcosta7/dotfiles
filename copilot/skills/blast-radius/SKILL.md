---
name: blast-radius
description: Find what a change could break beyond its diff and test the assumptions that make it safe. Use for "blast radius", "what could this break", indirect consumers, or a small change with uncertain downstream effects.
---

# Blast radius

Adapted from [pstack blast-radius](https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Find concrete failure paths, not a long list of hypothetical risks. A caller list is a starting point, not the result.

## Trace the change

1. Read the actual diff and the surrounding behavior. Identify changed contracts, default values, ownership, ordering and side effects.
2. Name the one or two assumptions the change's safety depends on. For example, "eviction removes only expired entries and never changes active requests."
3. Follow consumers beyond symbol references. Check serialized data, API responses, database columns, flags, generated code, other languages, caches and lifecycle timing when they are relevant.
4. For third-party behavior, inspect the pinned version and local patches. Current online documentation alone does not establish what the installed dependency does.
5. Trace each plausible failure from input to observable harm. Read the code that would prevent it before reporting it as a finding.

Use `why` when history could explain an unusual constraint. Work directly unless the change has substantial independent areas that warrant separate investigation. Do not require arena or a review panel for ordinary changes.

## Prove the safety assumptions

For each important assumption, distinguish its evidence level:

- An unsupported assertion is unproven.
- A source location establishes what the implementation says.
- A traced execution path explains why a bad case is blocked.
- A test or script calling the real code checks the assumption at runtime.
- A reproduction in the running application checks the real user path.

Run the cheapest check that addresses the actual risk. Preserve the runner's exit status and inspect the output. A search with no matches does not prove that there are no consumers. Do not call a mock of the behavior proof of the behavior.

For a confirmed bug, keep a focused reproduction or regression test. A read-only review may use an isolated scratch fixture, but do not modify product code unless a fix is requested.

## Report

Explain the changed behavior and the safety assumption first. Mark each assumption proven within the check's scope or unproven. Separate confirmed risks, plausible but unchecked risks, and checked cases that are safe.

Each retained risk names the failure path, affected consumer, source location, impact and evidence. Do not invent numerical probabilities. End with the smallest remaining check needed before relying on the change.

Example: a cache cleanup call looks harmless. Read the actual dependency implementation, determine whether cleanup also emits disposal events, and run a test with an active consumer. Do not infer safety from the method name.

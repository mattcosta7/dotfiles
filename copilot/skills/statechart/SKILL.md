---
name: statechart
description: "Model a flow as explicit states, events, context, guards, and effects before or while implementing it, including cancellation and stale async results. Use for state machines, statecharts, workflow or wizard flows, async loading or retry logic, impossible UI states, boolean-flag sprawl, or reducer design."
---

# Statechart

Adapted from pstack by Lauren Tan (MIT). See [NOTICE-pstack-LICENSE.txt](../../NOTICE-pstack-LICENSE.txt). Source: <https://github.com/cursor/plugins/blob/main/pstack/skills/statechart/SKILL.md>

Upstream checks a TLA+ model with TLC and draws a Mermaid chart. This version keeps the core idea: name the states the reader cares about, write the rules that must always hold, and replay any bad path against real code. It needs no model checker. Use TLA+ only if the user asks and the tooling is already available.

## Model first

Write these down, in the reader's words (what a user sees or cares about), not variable names:

- **States:** mutually exclusive, such as `idle`, `loading`, `ready`, `failed`. Replace combinations of booleans (`isLoading && isError`) with one state.
- **Events:** what can happen: user actions, responses, timeouts, cancellation.
- **Context:** data carried across states (result, error, attempt count, request id). Keep it only in the states where it is valid.
- **Invariants:** rules that must hold in every reachable state, for example "a submit button is enabled only when valid and not sending". Never weaken a rule to make the model pass.

## Transitions

Write an explicit table of `state + event -> next state`, with:

- **Guard:** the condition that allows it (`attempts < 3`).
- **Effect:** the side effect it starts (fetch, timer, navigation), stated separately from the state change.
- A decision for every unlisted pair: ignore, or error. Never leave it implicit.
- Every state has a way out, or is a deliberate end state.

```
state     event          guard          next      effect
idle      SUBMIT         valid          sending   start request(id)
sending   RESPONSE(id)   id == current  ready     -
sending   RESPONSE(id)   id != current  sending   - (stale, ignore)
sending   CANCEL         -              idle      abort request
sending   FAIL           attempts < 3   sending   retry
sending   FAIL           attempts >= 3  failed    -
```

In this example, increment attempts when starting a request and ignore unlisted events. Real flows must also define how a failed request retries and how cancellation invalidates its request id.

## Async hazards

- **Cancellation:** leaving a state or unmounting aborts its work (`AbortController`, clearing timers).
- **Stale results:** tag each request with an id or token and drop responses that do not match the current one. Late responses must not overwrite newer state.
- **Retries and timeouts:** put counts and delays in context and cap them.
- **Double events:** decide what a repeated SUBMIT does in `sending`.

## Implementation

Choose the smallest tool that fits the project. A discriminated-union state with a pure `reduce(state, event)` function or a transition table is usually enough. Add a state-machine library only if the project already uses one or the user asks. Keep the reducer pure and run effects outside it.

## Verify behavior

Test through events and observable output, not internals:

- One test per important path, including failure, cancel, retry, and a stale response arriving late.
- Assert the invariants after each event in a sequence.
- Run the effect handler with a fake clock or controllable promise so ordering is deterministic.

When a bad path is found in a model or a bug report, replay it step by step against the real code as a test or live repro. If it does not reproduce, suspect the model first.

## Hand off

Give the state list, transition table (or a Mermaid `stateDiagram-v2` when a picture helps), the invariants, and what the model leaves out. Keep diagrams to about 20 arrows. Merge states that behave the same.

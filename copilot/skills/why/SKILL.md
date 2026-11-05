---
name: why
description: Investigate why code or a design decision has its current shape using source history, PRs, issues and relevant operational evidence. Use for design rationale, historical tradeoffs, unexplained thresholds, defensive code or "why did we choose this".
---

# Why

Adapted from [pstack why](https://github.com/cursor/plugins/blob/main/pstack/skills/why/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Explain the forces behind the implementation. Current code establishes behavior, not the author's original intent. Do not turn a plausible story into a historical fact.

## Anchor the question

Identify the target symbol, file, threshold or decision. Use conversation context to resolve a vague reference and state the interpretation. Ask only when different interpretations would materially change the investigation.

Read the current implementation and relevant tests. Then trace the affected lines through `git blame`, path-scoped `git log` and the introducing patch. Follow renames when needed and inspect earlier changes, not just the most recent commit.

Retrieve related PR descriptions, reviews, discussions and linked issues with `gh`. Verify repository ownership before resolving a PR number. Cite other repositories as `owner/repo#number`.

## Follow the evidence

Start with source history and linked records. Search additional sources only when they can answer a concrete open question.

| Question | Useful evidence |
|---|---|
| Why was this implementation chosen? | Introducing commit, PR discussion, tests and design documents |
| What requirement forced the tradeoff? | Linked issue, acceptance criteria or product decision |
| Why this timeout, retry or defensive check? | Incident, error report, runtime measurements and the fixing change |
| Why this flag or numerical threshold? | Experiment definition, rollout record or original measurement |

Discover currently available tool capabilities before using optional services. Keep queries scoped by repository, topic and time. Read only relevant records, and keep private material out of public drafts.

Work directly for a continuous historical trace. Delegate only a substantial independent search. Do not require one agent per source, a synthesizer, a specific model or a sweep of every connected service.

Record which sources were checked and whether they returned relevant evidence. Name unavailable sources that limit the answer. A null result is not proof that the decision had no reason.

## Separate findings from inference

- **Established.** A cited record explicitly gives the rationale. Quote only the passage needed and check that it concerns this implementation.
- **Inferred.** Evidence supports an explanation but does not state it. Give the supporting facts and competing explanations that remain plausible.
- **Unknown.** The available record cannot answer the question. State the gap rather than inventing intent.

Check whether the original rationale still applies. A later revert, dependency change or removed constraint may make the historical answer different from the current recommendation.

## Answer

Lead with the strongest supported explanation and its confidence basis. Include only the history and tradeoffs needed to understand it. Link the evidence, identify meaningful gaps and distinguish an author's recorded decision from your recommendation.

If the user is considering a change, translate the findings into what must be preserved, what may change, and what must not be reintroduced. Do not edit code or contact an author just to settle a read-only question.

Example: a retry limit of three may look arbitrary. Find the introducing patch and its linked incident. If no record explains the number, report that the limit exists but its rationale is unknown. A present-day benchmark can guide a new value, not prove the old author's intent.

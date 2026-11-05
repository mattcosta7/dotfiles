---
name: recall
description: Reconstruct recent working context from Copilot session history and live repository state. Use for "recall my work on X", "catch me up", "where did I leave off", or resuming a topic across sessions.
---

# Recall

Adapted from [pstack recall](https://github.com/cursor/plugins/blob/main/pstack/skills/recall/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Return a current-state brief, not a transcript dump. This skill retrieves context. It does not resume implementation, change files or post a summary without being asked.

## Scope first

- Use the active repository and named topic. Default "recent" to the last seven days and state that window.
- Use an explicit wider window when requested. Do not silently narrow "all" to a handful of recent sessions.
- If the user already supplied a sufficient handoff, check its live state rather than mining history again.
- Do not search unrelated repositories or private transcripts without a request that covers them.

## Retrieve the relevant record

1. Use Copilot's session-history query tool when available. Start with time-bounded `sessions` and exact repository filters, or `session_refs` for a known PR, issue or commit. Read only needed columns.
2. Identify a small set of matching session IDs before searching their `turns`, `checkpoints` or `session_files`. Fetch only relevant passages. Keep local and cloud session identifiers distinct.
3. Extract the goal, decisions, failed approaches, user corrections, open questions and artifacts. Cite the session ID and turn or checkpoint when available.
4. For a named feature or bug, check the relevant issue, PR history and other explicitly available records. Do not require a separate investigator for each source.
5. Verify the discovered branch, changes, PR and issue status using read-only `git` and `gh` commands. Distinguish an earlier plan from a committed change and a merged PR.

Follow the query tool's current schema and time-bound filtering rules. Do not invent SQL columns or depend on a Cursor transcript directory. If history is unavailable, say so and reconstruct only what the supplied handoff and live repository can establish.

Search directly by default. Delegate only a genuinely large, independently partitionable history search. Do not launch agents for one or two relevant sessions.

## Brief

Lead with what the work is and where it stands now. Group related threads and mark their verified status, such as merged, open PR, uncommitted, reverted or planned. Include prior failed approaches only when they affect the next attempt.

End with the single most useful next action. Cite verified artifacts and label uncertain conclusions. Keep private context out of public drafts.

For activity summaries, include exploratory PRs opened during the requested window even if they have not merged. When the scope covers an organization, correlate related issues assigned to the user across its repositories. Do not broaden an ordinary repository recall into an organization-wide search.

Example request: "Where did I leave off on the retry fix?" Find matching recent sessions in the active repository, identify the branch and PR, check their current status, and explain what remains. Do not call a test passed because an old session planned to run it.

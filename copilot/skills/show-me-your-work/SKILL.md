---
name: show-me-your-work
description: Keep an evidence-linked decision log for long, unattended or multi-phase work. Use for "show me your work", "keep a decision trail", or an explicitly requested auditable autonomous run.
---

# Show me your work

Adapted from [pstack show-me-your-work](https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Keep one append-only decision log. Record consequential choices and verification checkpoints, not every tool call. Do not add a log to routine small tasks.

## Data shape and location

Use a UTF-8 TSV file with this header. The separator between columns is a tab.

```text
ts	run_id	phase	decision	why	evidence	result
```

`ts` is an actual ISO 8601 timestamp. `run_id` is the current session or agent identifier. `phase` names the workstream. `decision` and `why` are short factual sentences. `evidence` points to a real file, artifact, commit or URL. `result` gives the observed outcome, or `open` or `inconclusive`.

Keep `decisions.tsv` under the session artifact directory by default, outside the worktree. If no session directory is available, use an explicitly resolved task-specific temporary directory and report its location. Do not modify global ignore rules to hide it.

Store evidence outside disposable fixture directories. Never record tokens, credentials or sensitive payloads.

## Append decisions

1. Read the recent rows before appending to an existing log. Keep the actual `run_id` on each new row so a later session's work remains distinguishable.
2. Log a chosen approach, rejected alternative, pivot, blocker, completed unit or verification result when it changes the reader's understanding.
3. Point to evidence produced or read in this run. An intended check gets `open`, not `passed`.
4. Replace tabs and newlines inside cells with spaces. Before exporting to a spreadsheet, prefix a cell starting with `=`, `+`, `-` or `@` with a single quote so it cannot become a formula.
5. Correct mistakes by appending a superseding row that identifies the earlier row's timestamp and run ID. Never silently rewrite history.

Use one writer per log. Independent agents keep separate logs that the parent references, rather than racing to append to the same file.

## Audit before reporting

Read this run's rows against the actual conversation, tool results and available session history. Check that each action occurred and each evidence pointer resolves to what it claims. Add omitted pivots that materially affected the result.

If the transcript or artifact is unavailable, state that limitation. Do not fabricate a full audit. Independent review is optional when it would add value, not a mandatory agent spawn.

Report the log path, consequential unresolved decisions and any weak evidence. Commit or publish the log only when explicitly requested. A request to work unattended does not authorize either.

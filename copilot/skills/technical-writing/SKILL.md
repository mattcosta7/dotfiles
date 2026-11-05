---
name: technical-writing
description: "Sentence-level technical writing standard for clear, unambiguous prose. Use when writing or editing readmes, RFCs, design notes, PR descriptions, commit messages, comments, or error text, or when asked to tighten wording. For choosing document structure (tutorial, how-to, reference, explanation), use the documentation skill."
---

# Technical writing

Adapted from pstack by Lauren Tan (MIT). See [NOTICE-pstack-LICENSE.txt](../../NOTICE-pstack-LICENSE.txt). Source: <https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md>

Write so a tired engineer understands on the first read. This skill covers sentences. The installed **documentation** skill covers document type (Diátaxis); use it first when structure is the question, and keep one mode per document. Apply **unslop** for filler and AI-sounding patterns. Do not impose a template the user did not ask for.

## Rules above the rest

- Cut words that do no work. "In order to" becomes "to".
- Use the short, everyday word: "use", not "utilize".
- If a rule makes a sentence worse, rewrite it another way or leave it alone.
- Use real names: the actual symbol, file, flag, or command, in code font. Do not invent jargon.

## Sentences

- Address the reader as "you", in the present tense. Say who does what ("the compiler checks", not "is checked").
- Write instructions as commands, one per sentence: "Install the package."
- Put the condition or warning before the step: "To delete the file, run `rm`."
- Put the common case first, exceptions after.
- Split instructions over about 20 words and other sentences over about 25. Vary length so the prose does not read like a machine wrote it.
- Be specific: not "schema changes can cause issues" but "a column rename fails the build".
- Do not write "simply", "easy", or "quickly" in a procedure.
- Headings state the point, in sentence case. Task headings are verb phrases.
- Link with words that say where the link goes, never "click here".

## Remove ambiguity

- Keep "only" and "not" next to the word they change.
- Make each "it", "they", and "this" point at one noun. Repeat the noun when unsure.
- Break up long noun strings: "the script that checks the import budget".
- Keep "the", "a", and "that". Do not drop verbs for brevity.
- Call each thing by one name throughout.
- Use periods rather than semicolons or em dashes. No slashes ("a, b, or both"), idioms, or Latin abbreviations.

## PRs and commits

A PR description is a briefing a reviewer can read in under a minute: what changed, why, how it was verified, risks. Link logs, SHA lists, and metric tables instead of pasting them. A commit subject names the change in the imperative; the body gives the reason.

## Example

Before:

> Configuration of the proto import ratchet budget script parameters is performed via budget.json. Note that it's important to remember that running with --write should only be done when lowering it. If exceeded, CI fails.

After:

> `budget.mjs` reads the committed budget from `budget.json` and counts the files that import protos. If the count exceeds the budget, CI fails. Run `budget.mjs --write` only to lower the budget.

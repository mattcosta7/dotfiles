---
name: teach
description: Explain code, a subsystem or a change through its concrete behavior and supported design rationale. Use for "teach me this", "help me understand", or a guided explanation without implementation.
---

# Teach

Adapted from [pstack teach](https://github.com/cursor/plugins/blob/main/pstack/skills/teach/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Help the reader understand the mechanism. An explanation is the deliverable, not code changes or a report about the investigation.

## Ground the explanation

Infer the reader's purpose from the request and conversation, such as reviewing a change, debugging or joining a project. Do not quiz the reader about facts already available.

Read the relevant code and tests directly. Trace a concrete input, user action or event through the public entry point and the important state changes. A list of functions is reference material, not an explanation.

Use the installed `why` skill only when historical rationale matters. Preserve its distinction between recorded intent, inference and unknowns. Do not require a separate `how` skill, mandatory agents or a broad search for a narrow question.

## Explain in useful layers

Start with what the thing is and the problem it solves in this repository. Walk through one real example, then explain the important boundary, failure case or tradeoff.

Use actual names, paths and source locations. Explain unfamiliar terms when they first matter. Keep one name for each concept and avoid analogies that hide the mechanism.

Use a small Mermaid diagram or text trace when it explains a flow better than prose. Add detail only when it helps the reader's stated goal. Do not generate images unless the user asks for an image.

Give the smallest complete explanation first. For an explicitly requested deep dive, include the required detail rather than forcing multiple turns. Do not add quizzes, forced pauses or offers to continue.

Apply `unslop` to the prose. Distinguish observed behavior from predicted behavior and historical fact from inference. Cite only artifacts read in this session.

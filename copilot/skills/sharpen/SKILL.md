---
name: sharpen
description: Rewrite a task into a deeper, evidence-driven brief without expanding its scope or deciding user preferences. Use for /sharpen, "sharpen this task", or "make this prompt more rigorous".
---

# Sharpen

Adapted from [pstack sharpen](https://github.com/cursor/plugins/blob/main/pstack/skills/sharpen/SKILL.md) by Lauren Tan (MIT). See [the license](../../NOTICE-pstack-LICENSE.txt).

Run only when requested. Improve the task definition, not the size of the task. Rewriting a prompt does not authorize executing it.

Before rewriting, identify:

1. The strongest relevant practice a specialist would apply that the original request leaves implicit.
2. The primary evidence to start from, such as raw traces, a real reproduction, source history or observed user behavior, rather than a secondhand summary.
3. The concrete methods and available tools that can answer the question.
4. An observable acceptance criterion independent of the agent's confidence.

Then give the rewritten prompt in copyable Markdown. Preserve the user's goal, constraints, deliverable and scope. State assumptions instead of silently turning them into requirements.

Leave genuine product and preference decisions open. Do not add a migration, benchmark program, review panel or new dependency merely to sound rigorous. Do not promise unavailable tools or invent evidence.

Example: "Speed up this parser" becomes "Reproduce the slow case with representative input, profile the current parser, make the smallest change that preserves its outputs, and compare the same workload before and after. Report the commands, run variation and any cases not covered." It does not become a parser rewrite.

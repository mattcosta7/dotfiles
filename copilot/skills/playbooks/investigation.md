# Investigation

You own the answer. Read-only. The output is a cited explanation or a recommendation, not a code change.

1. Send Scout subagents over the relevant subsystems, in parallel when they are independent. For "why was it built this way" questions, also have Scout read git history (`git log -L`, `git blame`) and linked issues for the relevant lines.
2. Check Scout's key claims yourself by opening the cited files. Don't pass through what a subagent said.
3. Write the answer as Overview, Key concepts, How it works, Where things live, Gotchas. For a decision between options, give a recommendation with a tradeoffs table.
4. Apply the unslop skill to the reply.

No code changes. If the investigation leads to a change, say which playbook comes next and stop.

**Reply.** The investigation output. For "are we sure?" questions, give your real judgment with reasons, and push back if the premise is wrong.

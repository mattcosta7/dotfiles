---
name: reflect
description: Review the current session for durable lessons and turn each into a concrete edit to the factory's agents, skills or instructions. Use for /reflect, "capture what we learned", or after a task that went badly or took too long.
disable-model-invocation: true
---

# Reflect

Adapted from pstack by Lauren Tan (MIT).

Mine this conversation for lessons that should change how the factory works next time, then propose edits. Skip if the session was trivial or went exactly as the existing instructions said. One-offs are not lessons.

## 1. Gather

Write a tight digest of the session: the goal, what each agent did, where it went wrong or slow, every correction I made, and anything that took several tries.

## 2. Review through three lenses

Run three subagents in parallel on the digest. Use two different model families across them.

- **Judgment.** Where did an agent make a wrong call, ask when it should have acted, or act when it should have asked? Which instruction would have prevented it?
- **Tooling.** Which repeated manual step should be a script, test, lint rule or type? Which tool or command failed, and why?
- **Divergent.** What would a very different workflow have done here? Is any agent, skill or step not earning its place?

Each returns findings with the transcript evidence for each.

## 3. Synthesize

Sort every finding into **Accepted**, **Rejected** (with reason) or **Backlog**. For each Accepted item, give the exact target file and the edit. Targets, in order of preference:

1. A script, test, lint rule or type in the project (read the encode-lessons-in-structure principle). If it can be enforced this way, prefer that over more text.
2. An existing agent or skill. Edit the factory's source in `~/dotfiles/copilot/`, which `~/.copilot` links to. For third-party skills listed in `skills.lock`, change `skill-sources.txt` instead, since the sync script overwrites those copies.
3. The factory's `copilot-instructions.md`, only for rules that apply to every task.

Move anything a check would enforce better than prose to Backlog with the proposed check.

## 4. Apply only after approval

Show the full Accepted, Rejected and Backlog lists and wait for me to pick. Never auto-apply. After approval, make the edits in `~/dotfiles/copilot/` and commit them. Changes apply on this machine immediately through the links, and reach codespaces once they are on the dotfiles default branch.

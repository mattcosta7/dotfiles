---
name: interrogate
description: Adversarial multi-model review where only findings proven by a run survive. Use for /interrogate, "tear this apart", "stress test this", "find blind spots", or before finishing a contested or risky change.
argument-hint: What to interrogate (defaults to the uncommitted changes plus the branch diff)
---

# Interrogate

Adapted from pstack by Lauren Tan (MIT).

Adversaries try to break a change or design. A finding survives only when a run proves it. Report findings. Do not apply fixes.

## 1. Frame

- **Scope.** What I named. Otherwise the branch diff from its merge base with the default branch, plus uncommitted changes.
- **Intent.** Restate in your own words what the change is supposed to do, from my message, commit messages and the code. Ask only if the intent is truly unclear.

## 2. Fan out

Run two or three Adversary subagents in parallel, each on a **different model family** where your tool offers more than one, for example one Claude and one GPT model in Copilot. Different families find different failures. Claude Code offers only Claude models, so use two different ones there, such as opus and sonnet. Request the model explicitly for each one. In Copilot, a subagent can't use a pricier model than the session, so run this from your top-tier session.

Give each Adversary the scope, the intent, and this brief verbatim:

> Break this change. Prove each finding with a run against the real code, such as a failing test, a repro script, or command output that shows the wrong behavior. For a design or plan, run a prototype or probe the current tree. Put repro files under `./.scratch/interrogate-<your-model>/` and nowhere else. Report each finding with a title, the exact command, the output it printed, and the output the intent requires. Leave out anything you did not run. That covers style, naming, structure, and risks that need a future change to matter. No findings is a valid result.

## 3. Verify

Rerun every finding's command yourself. Keep a finding only when the output shows the failure and the failure breaks the intent. Drop the rest. Merge findings that share a root cause. Keep every verified finding from every adversary, not just one adversary's list.

## 4. Output

- **Intent.** The restatement.
- **Findings.** For each verified finding: the command, its output, how it breaks the intent, and which adversaries found it. Say "no verified findings" when none survive.
- **Dropped.** Per adversary, how many findings were dropped and why.

Delete `./.scratch/interrogate-*` afterwards unless a repro is worth keeping as a test.

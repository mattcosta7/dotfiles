---
name: ship-check
description: Independent pre-merge verification of a PR's exact head commit, run the way a user would use the change. Gives a PASS, PASS+NOTES or FAIL verdict. Use for /ship-check, "is this safe to merge", or before merging anything that matters.
argument-hint: "[PR number or URL]"
---

# Ship check

Adapted from the shipping playbook in pstack by Lauren Tan (MIT).

Green CI and an approving review are not a verdict. Neither runs the change as a user would. This skill produces a verdict from agents that did not write the code, for one exact commit. It never merges.

## 1. Pin the commit

Read the PR's `headRefOid`, `baseRefName` and description:
`gh pr view <pr> --json number,url,headRefOid,baseRefName,body,title`

The verdict covers that commit only. If the head moves later, the verdict is stale and the check runs again.

## 2. Check out the head in isolation

Don't disturb the current working tree. Create a separate worktree at the pinned commit:
```
git fetch origin pull/<pr>/head
git worktree add --detach ../<repo>-shipcheck-<pr> <headRefOid>
```

## 3. Derive what to check

From the PR description, linked issues and the diff (`gh pr diff <pr>`), write the acceptance criteria as a short checklist: what a user of this change should be able to do, and what must still work. If the PR doesn't say what it's for, write the criteria from the diff and label them inferred.

## 4. Verify, with agents that didn't write the code

Run these in parallel. Each works only inside the worktree.
- **Tester.** Install dependencies, run the build and the full test suite, then check each acceptance criterion through the code's real interface. That means running the CLI, calling the endpoint, or starting the app and exercising the flow, not just reading tests. Paste commands and output.
- **Reviewer.** Review the diff against the criteria, on a different model family from whoever wrote the code if you know it.

For risky changes (security, data, migrations, concurrency, public APIs), also run the **interrogate** skill on the worktree.

## 5. Verdict

- **PASS.** Builds, tests pass, every criterion verified by a run.
- **PASS+NOTES.** Safe to merge, with non-blocking findings listed.
- **FAIL.** Any criterion fails, the build or tests fail, or a verified blocker exists.

A criterion you couldn't verify by running it is not a pass. List it as unverified, and the verdict is at best PASS+NOTES.

## 6. Clean up and report

Remove the worktree: `git worktree remove ../<repo>-shipcheck-<pr>`.

Report the verdict, the commit SHA it covers, each criterion with its evidence, findings, and anything unverified. Post the verdict as a PR comment only if I ask, and write the comment body to a file first: `gh pr comment <pr> --body-file <file>`. Never merge. That stays my call.

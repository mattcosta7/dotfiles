import { test } from "node:test";
import assert from "node:assert/strict";
import { needsConfirmation } from "./patterns.mjs";

const confirm = [
    "git push --force origin main",
    "git push -f",
    "git push origin +feature",
    "git push --force-with-lease",
    "git push --force-if-includes origin x",
    "git -C . push --force origin main",
    "git -C /tmp/repo push -f origin feature",
    "git -c core.x=1 push -f",
    "git --no-pager push --force",
    "git push -uf origin feature",
    "git push origin main",
    "git push origin HEAD:main",
    "git push origin HEAD:refs/heads/main",
    "git -C repo push origin master",
    "gh pr merge 3",
    "gh pr merge --squash 12",
    "gh repo delete me/x --yes",
    "rm -rf build",
    "rm -fr x",
    "rm -r -f x",
    "rm --recursive --force x",
    "git reset --hard HEAD~1",
    "git -C repo reset --hard",
    "git clean -fd",
    "git branch -D old",
    "cd repo && git push --force",
];

const allow = [
    "git push origin feature",
    "git push -u origin copilot-config",
    "git push origin maintenance",
    "git status",
    "git -C repo log --oneline",
    "git reset --soft HEAD~1",
    "git branch -d merged",
    "git clean -n",
    "rm file.txt",
    "rm -r emptydir",
    "gh pr view 3",
    "gh pr create --base main",
];

for (const c of confirm) test(`asks: ${c}`, () => assert.notEqual(needsConfirmation(c), null));
for (const c of allow) test(`allows: ${c}`, () => assert.equal(needsConfirmation(c), null));

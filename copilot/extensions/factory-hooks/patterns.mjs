// git's global options can sit between `git` and the subcommand: git -C dir -c k=v --no-pager push.
const GIT = String.raw`\bgit(?:\s+(?:-[Cc]\s+\S+|--git-dir(?:=|\s+)\S+|--work-tree(?:=|\s+)\S+|--[\w-]+|-[a-zA-Z]))*\s+`;
const REST = String.raw`[^\n;&|]*`;

export const CONFIRM = [
    [new RegExp(`${GIT}push\\b${REST}(\\s--force(-with-lease|-if-includes)?\\b|\\s-[a-zA-Z]*f[a-zA-Z]*\\b|\\s\\+\\S)`), "force-push"],
    [new RegExp(`${GIT}push\\b${REST}\\s(\\S+\\s+)?(HEAD:)?(refs/heads/)?(main|master)\\b`), "push to the default branch"],
    [/\bgh\s+(-R\s+\S+\s+)?pr\s+merge\b/, "merging a pull request"],
    [/\bgh\s+(repo|release)\s+delete\b/, "deleting a repository or release"],
    [new RegExp(`${GIT}reset\\b${REST}\\s--hard\\b`), "discarding local changes"],
    [new RegExp(`${GIT}clean\\b${REST}\\s-[a-zA-Z]*f`), "deleting untracked files"],
    [new RegExp(`${GIT}branch\\b${REST}\\s(-D\\b|--delete\\s+--force\\b|--force\\s+--delete\\b)`), "force-deleting a branch"],
    [/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r\s+-f|-f\s+-r|--recursive\s+--force|--force\s+--recursive)\b/, "recursive delete"],
];

/** Returns the reason a command needs confirmation, or null. */
export const needsConfirmation = (command) => CONFIRM.find(([pattern]) => pattern.test(command))?.[1] ?? null;

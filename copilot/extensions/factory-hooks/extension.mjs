import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { joinSession } from "@github/copilot-sdk/extension";
import { needsConfirmation } from "./patterns.mjs";

const EVIDENCE_AGENTS = new Set(["Builder", "Tester"]);
const nudged = new Set();

const shellCommand = (input) => {
    if (!/^(bash|shell|powershell|zsh|sh)$/i.test(input.toolName)) return null;
    const args = input.toolArgs ?? {};
    return typeof args.command === "string" ? args.command : null;
};

const git = (cwd, ...args) => {
    try {
        return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", timeout: 2000 }).trim();
    } catch {
        return null;
    }
};

const repoFacts = (cwd) => {
    const root = git(cwd, "rev-parse", "--show-toplevel");
    if (!root) return null;
    const lines = [`Repository: ${root}`, `Branch: ${git(root, "branch", "--show-current") || "(detached)"} at ${git(root, "rev-parse", "--short", "HEAD") ?? "?"}`];
    const pkgPath = join(root, "package.json");
    if (existsSync(pkgPath)) {
        try {
            const scripts = Object.keys(JSON.parse(readFileSync(pkgPath, "utf8")).scripts ?? {});
            const lock = ["pnpm-lock.yaml", "yarn.lock", "bun.lockb", "package-lock.json"].find((f) => existsSync(join(root, f)));
            const pm = { "pnpm-lock.yaml": "pnpm", "yarn.lock": "yarn", "bun.lockb": "bun" }[lock] ?? "npm";
            if (scripts.length) lines.push(`Package scripts (run with ${pm} run <name>): ${scripts.join(", ")}`);
        } catch {
            // An unreadable package.json just means no script hints.
        }
    }
    return lines.join("\n");
};

await joinSession({
    hooks: {
        onPreToolUse: (input) => {
            const command = shellCommand(input);
            if (!command) return;
            const reason = needsConfirmation(command);
            if (!reason) return;
            return {
                permissionDecision: "ask",
                permissionDecisionReason: `factory-hooks: ${reason} needs explicit confirmation.`,
            };
        },
        onSubagentStart: (input) => {
            const facts = repoFacts(input.workingDirectory);
            return facts ? { additionalContext: `Facts about the working repository, gathered by a hook:\n${facts}` } : undefined;
        },
        onSubagentStop: (input) => {
            if (!EVIDENCE_AGENTS.has(input.agentName)) return;
            const key = input.agentId ?? input.transcriptPath;
            if (nudged.has(key) || /```/.test(input.response)) return;
            nudged.add(key);
            return {
                decision: "block",
                reason: "Your report has no pasted command output. Run the build, test or repro command that proves your work and paste its output verbatim in a fenced block, or say plainly that you could not run it and why.",
            };
        },
    },
});

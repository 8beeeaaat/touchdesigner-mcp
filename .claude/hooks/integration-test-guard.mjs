#!/usr/bin/env node
// PreToolUse(Bash) guard: block `git push` when the outgoing commits change
// MCP/API source without an accompanying integration test change.
//
// Checked at push time (not commit time) so the gate fires once, right before
// the work is shared, over the whole set of commits being pushed.
//
// Escape hatch: prefix the push with SKIP_ITEST_GUARD=1 (or set it in the env)
// when the change genuinely needs no integration test.
//
// Pure Node (no bash/grep/sed/python): runs on macOS, Linux, and Windows
// (cmd/PowerShell/Git Bash) as long as `node` and `git` are on PATH.
//
// Exit codes: 0 = allow, 2 = block and feed stderr back to Claude.

import { execFileSync } from "node:child_process";

const API_RE =
  /^(src\/api\/|src\/features\/tools\/|src\/server\/|src\/tdClient\/|src\/transport\/|td\/modules\/mcp\/)/;
const ITEST_RE = /^tests\/integration\//;

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => resolve(s));
    process.stdin.on("error", () => resolve(s));
  });
}

function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const raw = await readStdin();
let cmd = "";
try {
  cmd = String((JSON.parse(raw).tool_input || {}).command || "");
} catch {}

// Only act on git push.
if (!cmd.includes("git push")) process.exit(0);

// Skip branch/tag deletions and tag pushes; explicit opt-out.
if (/--delete|--tags|SKIP_ITEST_GUARD/.test(cmd)) process.exit(0);
if (process.env.SKIP_ITEST_GUARD === "1") process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Determine the base of the outgoing range (what this push will add).
let base = git(
  ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
  cwd,
);
if (!base) {
  // New branch with no upstream: compare against origin/main.
  if (git(["rev-parse", "--verify", "-q", "origin/main"], cwd)) {
    base = git(["merge-base", "origin/main", "HEAD"], cwd);
  }
}
// Can't determine what's outgoing → don't block.
if (!base) process.exit(0);

const changed = git(["diff", "--name-only", `${base}..HEAD`], cwd)
  .split("\n")
  .filter(Boolean);
if (changed.length === 0) process.exit(0);

const apiFiles = changed.filter((f) => API_RE.test(f));
const hasTest = changed.some((f) => ITEST_RE.test(f));

if (apiFiles.length > 0 && !hasTest) {
  const lines = [
    "⛔ integration-test-guard: outgoing commits change MCP/API source without an integration test.",
    "",
    "Changed API/MCP files in this push:",
    ...apiFiles.map((f) => `  - ${f}`),
    "",
    "Add or update a test under tests/integration/ (run the integration-test-guard skill),",
    "commit it, and push again — or, if this change truly needs no integration test,",
    "re-run the push with SKIP_ITEST_GUARD=1 prefixed.",
  ];
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(2);
}

process.exit(0);

#!/usr/bin/env node
// PreToolUse hook for mcp-onboard.
// Validates .mcp.json edits BEFORE they are written:
//   - hard block (deny) only on invalid JSON syntax of the resulting file
//   - warnings (allow + systemMessage) for structural / secret-leak issues
// Non-.mcp.json edits are passed through untouched.
//
// Input: PreToolUse JSON on stdin (tool_name, tool_input{ file_path, content, new_string, ... }).
// Output: hookSpecificOutput.permissionDecision = "allow" | "deny" + systemMessage.

import { readFileSync } from "node:fs";

function emit(decision, message) {
  const out = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision } };
  if (message) out.systemMessage = message;
  process.stdout.write(JSON.stringify(out));
  // deny is conveyed via JSON; exit 0 so the JSON (not a shell error) is what Claude sees.
  process.exit(0);
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let payload;
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {
  // If we can't parse our own input, don't block the user's work.
  emit("allow");
}

const toolName = payload.tool_name || "";
const input = payload.tool_input || {};
const filePath = input.file_path || input.path || "";

// Only act on .mcp.json files; pass everything else through.
if (!/(^|[\\/])\.mcp\.json$/.test(filePath)) {
  emit("allow");
}

// Reconstruct the intended resulting content for the supported edit tools.
function resultingContent() {
  if (toolName === "Write") {
    return input.content ?? "";
  }
  // Edit / other string-replace tools: apply the replacement to the current file.
  let current = "";
  try {
    current = readFileSync(filePath, "utf8");
  } catch {
    current = "";
  }
  if (typeof input.new_string === "string" && typeof input.old_string === "string") {
    if (input.replace_all) {
      return current.split(input.old_string).join(input.new_string);
    }
    return current.replace(input.old_string, input.new_string);
  }
  // Unknown edit shape — fall back to current file so we at least validate something.
  return current;
}

const content = resultingContent();

// 1) Hard requirement: valid JSON. This is the only blocking check.
let parsed;
try {
  parsed = JSON.parse(content);
} catch (e) {
  emit(
    "deny",
    `mcp-onboard: refusing to write ${filePath} — the result is not valid JSON (${e.message}). ` +
      `Fix the syntax (check for trailing commas / unbalanced braces) and retry.`,
  );
}

// 2..4) Non-blocking structural & secret warnings.
const warnings = [];
const servers = parsed?.mcpServers;
if (!servers || typeof servers !== "object") {
  warnings.push('missing a top-level "mcpServers" object — Claude Code will not pick up any server.');
} else {
  for (const [name, spec] of Object.entries(servers)) {
    if (!spec || typeof spec !== "object") {
      warnings.push(`server "${name}" is not an object.`);
      continue;
    }
    const hasCommand = typeof spec.command === "string";
    const hasUrl = typeof spec.url === "string";
    if (hasCommand && hasUrl) {
      warnings.push(`server "${name}" has both "command" and "url" — pick stdio (command) OR http/sse (url).`);
    }
    if (!hasCommand && !hasUrl) {
      warnings.push(`server "${name}" has neither "command" (stdio) nor "url" (http/sse).`);
    }
    if (hasUrl && typeof spec.type !== "string") {
      warnings.push(`server "${name}" has a url but no "type" — set "http" (or "sse").`);
    }
    // Secret-leak heuristic: a header/env value that looks like a real token, not ${VAR}.
    const buckets = [spec.env, spec.headers].filter((b) => b && typeof b === "object");
    for (const bucket of buckets) {
      for (const [k, v] of Object.entries(bucket)) {
        if (typeof v === "string" && !/\$\{[^}]+\}/.test(v) && /[A-Za-z0-9_\-]{20,}/.test(v)) {
          warnings.push(`server "${name}" key "${k}" may contain a raw secret — use \${ENV_VAR} instead.`);
        }
      }
    }
  }
}

if (warnings.length > 0) {
  emit(
    "allow",
    "mcp-onboard: .mcp.json is valid JSON but has potential issues:\n- " + warnings.join("\n- "),
  );
}

emit("allow");

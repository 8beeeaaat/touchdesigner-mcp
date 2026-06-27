# MCP Troubleshooting — Symptom → Cause → Fix

Shared diagnostic rule set. The `mcp-doctor` agent uses this as its checklist; the
`mcp-setup` skill consults it after writing config.

Work top-down: connection first, then auth, then tools, then Apps UI. A failure early
in the chain explains everything after it.

## 1. Server not listed / not connecting

**Symptom**: `/mcp` does not show the server, or shows it as failed/disconnected.

| Likely cause | How to confirm | Fix |
|---|---|---|
| `.mcp.json` invalid JSON | `node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8'))"` errors | Fix syntax (the PreToolUse hook normally blocks this) |
| Wrong scope / file not picked up | `claude mcp list` / `claude mcp get <name>` | Re-add in the intended scope (`--scope project`) |
| `command` not found (stdio) | run the `command` + `args` manually in a shell | Install the tool / fix the binary path / use `npx -y` |
| Server crashes on start | run it manually; read stderr | Fix missing env vars / args per the server README |
| Stale session | server was added mid-session | Restart Claude Code so it reloads config |

## 2. Authentication failures

**Symptom**: connects but tools error with 401/403, or `/mcp` shows auth required.

| Likely cause | How to confirm | Fix |
|---|---|---|
| Env var unset/empty | echo the referenced `${VAR}` | Set it in shell/keychain/gitignored `.env` |
| Wrong header name/format | compare against server docs | Match exact header (e.g. `Authorization: Bearer ${TOKEN}`) |
| Expired OAuth token | `/mcp` prompts re-auth | `claude mcp logout <name>` then `claude mcp login <name>` |
| Token committed/rotated | value is a raw string in `.mcp.json` | Move to `${VAR}`, rotate the leaked token |

## 3. Tools missing or not callable

**Symptom**: server connects but expected tools do not appear or are not permitted.

| Likely cause | How to confirm | Fix |
|---|---|---|
| Server exposes fewer tools than expected | `/mcp` tool list; server README | Verify version/feature flags of the server |
| Tool blocked by permissions | tool call prompts/denies | Pre-allow `mcp__<name>__<tool>` in settings/command frontmatter |
| Name assumptions wrong | actual names are `mcp__<name>__<tool>` | Use the namespaced names from `/mcp` |

## 4. MCP Apps UI not rendering

**Symptom**: tools work and return data, but no webview/UI appears.

| Likely cause | How to confirm | Fix |
|---|---|---|
| Client too old | check Claude Code version | Update Claude Code to a version supporting MCP Apps |
| Host surface can't show webviews | running in a bare/stdio context | Use a GUI surface (desktop/VS Code/web) |
| Tool doesn't return a UIResource | server docs for that tool | Call the tool that is documented to return UI |
| Server not actually Apps-capable | handshake capability | Confirm the server advertises UI support |

## Diagnostic order summary

```text
connected? ── no ─▶ section 1
   │ yes
auth ok? ── no ─▶ section 2
   │ yes
tools present? ── no ─▶ section 3
   │ yes
UI expected & missing? ── yes ─▶ section 4
```

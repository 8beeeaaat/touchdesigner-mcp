# mcp-onboard

A Claude Code plugin that helps you — the **consumer** of MCP servers — find, install,
configure, use, and troubleshoot Model Context Protocol servers, including MCP Apps
(UI-returning servers).

It does not help you *author* MCP servers; it helps you get the most out of servers that
already exist.

## What's inside

| Component | Type | What it does |
|-----------|------|--------------|
| `mcp-knowledge` | Skill (auto) | Reference knowledge: `.mcp.json` schema, transports, scopes, auth, MCP Apps, troubleshooting. The shared foundation other components cite. |
| `mcp-setup` | Skill (`/mcp-onboard:mcp-setup`) | Add an MCP server to `.mcp.json` with the right transport, scope, and `${ENV_VAR}` auth — then verify the connection. |
| `mcp-tools` | Skill (`/mcp-onboard:mcp-tools`) | Inventory the MCP tools currently connected and propose concrete ways to use them. |
| `mcp-scout` | Agent | Research, compare, and recommend an MCP server for a goal, with install details and sources. |
| `mcp-doctor` | Agent | Diagnose a misbehaving MCP server (connection / auth / missing tools / Apps UI) and propose minimal fixes. |
| PreToolUse hook | Hook | Validates `.mcp.json` edits before they are written — blocks invalid JSON, warns on structural/secret issues. |

These map to the five onboarding concerns: **discover** (scout) → **install/configure**
(setup + hook) → **use** (tools) → **troubleshoot** (doctor), with **MCP Apps** support
woven through knowledge, setup, and doctor.

## How the pieces fit together

```text
"find an MCP for X"      → mcp-scout  ─┐
"add the github server"  → mcp-setup ──┼─ both read mcp-knowledge/references/*
"what tools do I have"   → mcp-tools  ─┘
"my server won't work"   → mcp-doctor ── reads troubleshooting.md
editing .mcp.json        → PreToolUse hook validates the result
```

## Installation (local testing)

From the repository that contains this plugin:

```bash
# Point Claude Code at the plugin directory
claude --plugin-dir /Users/komakisadao/git/touchdesigner-mcp/plugins/mcp-onboard
```

Hooks load at session start, so start a fresh session after enabling the plugin.

## Usage

- Ask naturally and the right component triggers:
  - "Is there an MCP server for Postgres?" → `mcp-scout`
  - "My remote MCP server keeps returning 401." → `mcp-doctor`
  - "What can the connected MCP servers do?" → `mcp-tools`
- Or invoke skills explicitly:
  - `/mcp-onboard:mcp-setup github`
  - `/mcp-onboard:mcp-tools`

## The PreToolUse hook

`hooks/scripts/validate-mcp-json.mjs` runs before any `Write`/`Edit`. It only acts on
files named `.mcp.json`; everything else passes through. For a `.mcp.json` edit it:

- **denies** the write only when the resulting file is not valid JSON;
- **allows** with a warning for structural issues (missing `mcpServers`, a server with
  both/neither `command` and `url`, a `url` without `type`) or a value that looks like a
  raw secret instead of `${ENV_VAR}`.

This keeps iterative editing unblocked while preventing a broken config from landing.

Requires `node` on `PATH` (no external npm dependencies).

## Security notes

- Secrets are always referenced as `${ENV_VAR}`; never write a raw token into `.mcp.json`
  (project-scope config is committed).
- `mcp-doctor` is read-only by design: it diagnoses and proposes, it does not mutate
  `.mcp.json` or run destructive commands, and it never prints secret values.

## Testing the hook directly

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/.mcp.json","content":"{ bad json"}}' \
  | node hooks/scripts/validate-mcp-json.mjs
# → permissionDecision: "deny"
```

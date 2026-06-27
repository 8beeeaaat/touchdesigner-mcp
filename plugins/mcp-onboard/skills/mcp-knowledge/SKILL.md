---
name: MCP Knowledge
description: This skill should be used when working with MCP server configuration in Claude Code — when the user asks about ".mcp.json", "MCP server scopes", "stdio vs HTTP transport", "MCP environment variables", "how MCP servers are configured", "MCP Apps", "UIResource", or needs accurate reference knowledge about Model Context Protocol setup, transports, scopes, or authentication. Provides the schema and conventions that the mcp-setup, mcp-tools, mcp-scout, and mcp-doctor components rely on.
version: 0.1.0
---

# MCP Knowledge

Reference knowledge for configuring and reasoning about MCP (Model Context Protocol)
servers in Claude Code, from the perspective of a user who consumes MCP servers
(not one who authors them).

This skill is the shared foundation that `mcp-onboard`'s other components build on.
Load the relevant reference file before editing config, diagnosing a problem, or
recommending a server.

## Core Concepts (load references for detail)

MCP connects Claude Code to external tools/data via servers. A server is declared in
JSON and started by Claude Code. Three facts drive almost every decision:

1. **Transport** — how Claude Code talks to the server: `stdio` (local subprocess),
   `http` / streamable HTTP (remote URL), or SSE (legacy remote). Choose by where the
   server runs.
2. **Scope** — where the server declaration lives: project, user (global), or local.
   Scope decides who sees the server and whether it is committed to git.
3. **Auth & secrets** — never hardcode tokens. Use `${ENV_VAR}` expansion or the
   server's own OAuth flow.

## Config Quick Reference

A `.mcp.json` (or the `mcpServers` block in settings) maps a server name to its launch
spec:

```jsonc
{
  "mcpServers": {
    "my-local-server": {
      "command": "npx",
      "args": ["-y", "@scope/some-mcp-server"],
      "env": { "API_KEY": "${MY_API_KEY}" }
    },
    "my-remote-server": {
      "type": "http",
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${TOKEN}" }
    }
  }
}
```

- **stdio server** → requires `command` (+ optional `args`, `env`). No `url`.
- **http/sse server** → requires `type` and `url` (+ optional `headers`). No `command`.
- Server name: lowercase, hyphenated, unique within the file.

For the full field-by-field schema, transport selection rules, and validation logic,
read **`references/config-schema.md`**.

## Scope Selection

| Scope   | File                          | Visibility                  | Committed? |
|---------|-------------------------------|-----------------------------|------------|
| project | `.mcp.json` (repo root)       | everyone on the project     | yes        |
| user    | `~/.claude.json` (user config)| all of the user's projects  | no         |
| local   | project-local user settings   | only this user, this project| no         |

Default to **project scope** for servers the whole team needs; use **user scope** for
personal tools; use **local scope** for experiments or machine-specific secrets.
Details and the exact `claude mcp add --scope` mapping: **`references/scopes-and-auth.md`**.

## MCP Apps (UI-returning servers)

Newer MCP servers can return interactive UI (an "MCP App") alongside tool results via a
**UIResource**. From the consumer side, the key points are:

- The server advertises a UI capability; the host (Claude Code) renders it in a webview.
- Enabling/seeing the UI may require a recent Claude Code version and the server being
  declared like any other MCP server — no special client config beyond that.
- If tools work but no UI appears, that is an Apps-specific symptom — see the doctor flow.

Consumer-side specifics, version requirements, and how to verify a UI rendered:
**`references/mcp-apps.md`**.

## How Other Components Use This

- **mcp-setup skill** → reads `config-schema.md` + `scopes-and-auth.md` to write valid entries.
- **mcp-tools skill** → uses transport/auth knowledge to explain what a server exposes.
- **mcp-scout agent** → uses transport/scope knowledge to recommend the right install form.
- **mcp-doctor agent** → uses all references as the diagnostic rule set.

## Keeping Knowledge Current

MCP evolves (Apps especially). When a fact here may be stale, prefer fetching current
docs via Context7 (`modelcontextprotocol` / Claude Code docs) over relying on memory,
then reconcile with these references.

## Additional Resources

### Reference Files

- **`references/config-schema.md`** — full `.mcp.json` schema, transport rules, validation
- **`references/scopes-and-auth.md`** — scope semantics, `claude mcp add` mapping, secrets
- **`references/mcp-apps.md`** — MCP Apps consumer guide and verification
- **`references/troubleshooting.md`** — symptom → cause → fix table (shared with doctor)

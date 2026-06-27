# .mcp.json Schema & Transport Rules

Reference for the structure Claude Code expects when declaring MCP servers, and the
rules used to validate an entry before writing it.

## Top-Level Shape

A `.mcp.json` at a project root holds a single `mcpServers` object mapping each server
name to a launch spec:

```json
{
  "mcpServers": {
    "<server-name>": { /* launch spec */ }
  }
}
```

> Note: when configuring MCP **inside a plugin**, the same launch spec is used, but the
> file may be a bare object (no `mcpServers` wrapper) per the plugin `.mcp.json`
> convention, or inlined under `mcpServers` in `plugin.json`. For end-user project
> configuration (the focus of this plugin), always use the `mcpServers` wrapper above.

### Server name rules

- Lowercase, hyphen-separated (`github`, `my-db-tools`).
- Unique within the file.
- Becomes the namespace prefix for that server's tools (`mcp__<name>__<tool>`).

## Launch Spec by Transport

### stdio (local subprocess) — most common for local tools

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
  "env": { "SOME_KEY": "${SOME_KEY}" }
}
```

Required: `command`. Optional: `args` (array of strings), `env` (string→string map).
Must NOT contain `url`. The presence of `command` implies stdio (no explicit `type`
needed, though `"type": "stdio"` is accepted).

### http / streamable HTTP (remote) — hosted services

```json
{
  "type": "http",
  "url": "https://api.example.com/mcp",
  "headers": { "Authorization": "Bearer ${API_TOKEN}" }
}
```

Required: `type: "http"` and `url`. Optional: `headers` (string→string map).
Must NOT contain `command`.

### sse (remote, legacy) — older hosted services

```json
{
  "type": "sse",
  "url": "https://api.example.com/sse",
  "headers": { "Authorization": "Bearer ${API_TOKEN}" }
}
```

Same shape as http but `type: "sse"`. Prefer `http` for new servers; use `sse` only
when the server documents it.

## Transport Selection Rule

| Where does the server run?              | Transport |
|-----------------------------------------|-----------|
| Locally, as a command you can run       | `stdio`   |
| Remotely, modern HTTP endpoint          | `http`    |
| Remotely, only documents an SSE endpoint| `sse`     |

If a server's README gives an `npx`/`uvx`/binary command → stdio. If it gives a URL
→ http (or sse if explicitly stated).

## Environment Variable Expansion

- `${VAR}` is expanded from the environment when the server launches.
- Use it for every secret. Never inline a raw token in `.mcp.json` (it is committed).
- For plugin-internal paths use `${CLAUDE_PLUGIN_ROOT}` (not relevant for end-user
  project servers, but appears in plugin-provided servers).

## Validation Checklist (used by the PreToolUse hook)

A well-formed entry satisfies ALL of:

1. File parses as JSON (no trailing commas, balanced braces) — **hard requirement**.
2. Has a top-level `mcpServers` object.
3. Each server has EITHER `command` (stdio) OR `type` + `url` (http/sse), never both.
4. No raw-looking secrets in plaintext (warn, do not block) — values matching common
   token shapes that are NOT `${...}` are suspicious.

Failures of (1) must block the write. Failures of (2)–(4) are warnings: surface them
but do not prevent the edit, so iterative editing stays unblocked.

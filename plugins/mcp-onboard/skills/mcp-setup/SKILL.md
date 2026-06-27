---
name: MCP Setup
description: This skill should be used when the user asks to "add an MCP server", "set up MCP", "configure .mcp.json", "install <X> MCP server", "connect <service> via MCP", "enable an MCP Apps server", or wants help wiring an MCP server into Claude Code with the right scope, transport, and auth. Guides writing a valid .mcp.json entry and verifying the connection.
argument-hint: "[server name or description, e.g. 'github' or 'a filesystem server for ./data']"
allowed-tools: Read, Edit, Write, Bash, Skill
version: 0.1.0
---

# MCP Setup

Guide configuring an MCP server into Claude Code for a *consumer*: pick the transport
and scope, write a valid `.mcp.json` entry, wire up auth via env vars, and verify the
connection. Operate on `$ARGUMENTS` as the target server (a name like `github`, or a
description of what the user wants).

Load the `mcp-knowledge` skill's references for the authoritative schema and scope
rules before writing config — do not rely on memory for field shapes.

## Workflow

### 1. Clarify the target

From `$ARGUMENTS`, determine:
- **What server**: a known package/URL, or a capability the user wants. If only a
  capability is given and the concrete server is unknown, recommend invoking the
  `mcp-scout` agent first to choose one, then return here.
- **Transport**: stdio (local command) vs http/sse (remote URL) — decide from how the
  server is distributed (command → stdio, URL → http). See
  `mcp-knowledge/references/config-schema.md`.
- **Scope**: project (committed, team-shared) / user (personal, all projects) / local
  (this user, this project, uncommitted). Default to project unless the user implies
  otherwise. See `mcp-knowledge/references/scopes-and-auth.md`.

If any of these three is ambiguous, ask the user before writing anything.

### 2. Choose the write method

Two valid paths — pick based on the user's intent:

- **CLI (`claude mcp add`)** — preferred when the user wants the safest path and does not
  need to review a diff. It writes valid JSON to the correct scope. Construct the command
  per `scopes-and-auth.md`; show it to the user and run it via Bash only after they agree.
- **Hand-edit `.mcp.json`** — preferred when the server is project-scoped and the user
  wants a reviewable change in the repo. Read the existing file first (if present), then
  Edit/Write the merged result.

### 3. Compose the entry

Build the launch spec for the chosen transport (full schema in `config-schema.md`):

- stdio → `command` (+ `args`, `env`), no `url`.
- http/sse → `type` + `url` (+ `headers`), no `command`.
- Every secret as `${ENV_VAR}` — never a raw token. Tell the user which env vars they
  must set and where (gitignored `.env` / shell / keychain).

### 4. Present before writing

This step is mandatory because `.mcp.json` is a committed, shared file. Show the exact
JSON (or CLI command) that will be applied and the list of required env vars, then get
explicit confirmation. Only then Edit/Write or run the command. If the plugin's
PreToolUse hook is active, it will additionally validate the JSON on write — if it
blocks, fix the reported syntax error and retry.

### 5. Verify

After writing:
1. Run `claude mcp get <name>` (or `claude mcp list`) to confirm it resolved in the
   intended scope.
2. Tell the user that a Claude Code restart may be needed for a newly added server to
   connect, then to run `/mcp` and confirm the server is listed and its tools appear.
3. For an **MCP Apps** server, also confirm a UI renders when its UI-returning tool is
   called — see `mcp-knowledge/references/mcp-apps.md`.

If verification fails at any point, first consult
`mcp-knowledge/references/troubleshooting.md` (symptom → cause → fix) for a quick
self-resolution; if that does not resolve it, hand off to the `mcp-doctor` agent.

## Guardrails

- Never write a real secret into `.mcp.json`; use `${VAR}`.
- Never overwrite an existing server entry without showing the before/after and
  confirming.
- For project scope, remind the user the change is committed and visible to the team.

## Related

- `mcp-knowledge` skill — schema, scopes, auth, Apps references (load its files).
- `mcp-scout` agent — when the concrete server to install is not yet decided.
- `mcp-doctor` agent — when verification fails.

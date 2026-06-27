---
name: MCP Tools Explorer
description: This skill should be used when the user asks "what MCP tools do I have", "what can this MCP server do", "explain the tools from <server>", "how do I use <mcp tool>", "what's available via MCP", or wants an inventory and practical usage suggestions for the MCP tools currently connected in Claude Code. Surveys connected servers' tools and proposes concrete ways to use them.
argument-hint: "[optional: a server name to focus on, e.g. 'github']"
allowed-tools: Read, Bash, Skill
version: 0.1.0
---

# MCP Tools Explorer

Take inventory of the MCP tools currently available in this Claude Code session and turn
that into practical activation suggestions. The goal is to help the user actually *use*
what is connected, not just list names. If `$ARGUMENTS` names a server, focus the
inventory on that server.

## Workflow

### 1. Gather the connected tools

MCP tools are namespaced `mcp__<server>__<tool>`. Determine what is available:

- Use `claude mcp list` (via Bash) as the source of truth for which servers are
  configured and connected — do not rely on self-introspection of the model's own tool
  list, which is unreliable for enumerating `mcp__` tools.
- Supplement with the in-session tools visible to the model (those prefixed `mcp__`) for
  per-tool detail, grouped by `<server>`. Treat any mismatch with `claude mcp list` as a
  signal that a server is configured but not connected.
- If a configured server has no tools showing, that is a connection/auth problem — point
  the user to the `mcp-doctor` agent rather than guessing.

### 2. Build the inventory

For each server (or the one in `$ARGUMENTS`), produce a compact table:

| Server | Tool | What it does | Typical use |
|--------|------|--------------|-------------|

Derive "what it does" from the tool's own description/schema (read it, do not invent).
Keep "typical use" concrete and tied to the user's likely workflow.

### 3. Propose activations

Go beyond listing. For the most useful tools, suggest 2–4 concrete actions the user
could take right now, phrased as things they can ask for. Favor:

- High-leverage tools (search, read, query) that unlock follow-on work.
- Combinations across servers (e.g. fetch with one, write with another).
- Anything that matches the user's stated goal in `$ARGUMENTS` or the conversation.

### 4. Note gaps

If the user's apparent goal is not covered by any connected tool, say so and recommend
the `mcp-scout` agent to find a server that fills the gap, or the `mcp-setup` skill to
add a known one.

## Notes

- Read tool descriptions/schemas for accuracy; never fabricate a tool's capability.
- Distinguish "configured but not connected" (a doctor problem) from "not installed"
  (a scout/setup problem).
- For permission errors when a tool exists but can't be called, see
  `mcp-knowledge/references/troubleshooting.md` section 3.

## Related

- `mcp-knowledge` skill — transport/auth context for interpreting servers.
- `mcp-scout` agent — find new servers to fill capability gaps.
- `mcp-doctor` agent — when a configured server shows no tools.

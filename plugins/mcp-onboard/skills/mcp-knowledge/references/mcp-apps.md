# MCP Apps — Consumer Guide

MCP Apps let a server return interactive UI (a webview) alongside normal tool results,
via a **UIResource**. This guide is for the *consumer* side: enabling, using, and
verifying Apps-capable servers. (Authoring UIResources is out of scope for this plugin.)

> MCP Apps is an evolving area of the protocol. When a detail below may be outdated,
> fetch current docs via Context7 (`modelcontextprotocol`, Claude Code docs) and
> reconcile.

## What changes for the consumer

Almost nothing in configuration. An Apps-capable server is declared in `.mcp.json` the
same way as any stdio/http server. The difference is at runtime:

1. The server advertises a UI capability during the MCP handshake.
2. When a tool that returns a UIResource is called, the host (Claude Code) renders the
   UI in a webview instead of (or alongside) plain text/JSON.

There is no extra client-side field to enable Apps beyond declaring the server.

## Requirements to actually see UI

- A **recent Claude Code version** that supports rendering MCP Apps webviews. If tools
  work but UI never appears, an out-of-date client is the first suspect.
- A host surface that can show webviews (the desktop/VS Code/web app surfaces render UI;
  a bare stdio pipe cannot).
- The server genuinely returning a UIResource for the tool invoked — not every tool on
  an Apps server returns UI.

## Verifying a UI rendered

1. Confirm the server is connected: `/mcp` lists it and its tools.
2. Invoke a tool documented to return UI.
3. Expect a rendered panel/webview rather than raw JSON.
4. If only JSON/text appears, treat it as the "Apps UI not rendering" symptom (see
   `troubleshooting.md`): check client version, host surface, and that the specific tool
   returns a UIResource.

## Relationship to this repository

This repo (`touchdesigner-mcp`) is itself building an MCP Apps guest UI (node browser,
"MCP Apps v7 / ext-apps"). It is a concrete example of a server that returns UIResources.
When testing consumer-side behavior, that server's node-browser tool is a useful target
for confirming a webview renders end to end.

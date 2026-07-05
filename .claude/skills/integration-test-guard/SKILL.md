---
name: integration-test-guard
description: >
  Ensure MCP-server / API changes in the touchdesigner-mcp repo ship with
  integration-test coverage. Use when you modify the MCP server, tool
  definitions/handlers, the OpenAPI schema, the TD HTTP client, the transport
  layer, or the TD-side Python API (src/api, src/features/tools, src/server,
  src/tdClient, src/transport, td/modules/mcp). Also triggered by the
  integration-test-guard PreToolUse hook, which blocks a `git push` whose
  outgoing commits touch those paths without a tests/integration change.
  Decide which suite fits, add or update the test, and run it.
---

# Integration Test Guard

When you change the **MCP server / API surface**, add or update an integration
test in `tests/integration/`. The `integration-test-guard` hook blocks
`git push` when the outgoing commits touch API/MCP source without one (override
with `SKIP_ITEST_GUARD=1` only when a test genuinely does not apply).

## What counts as "API/MCP surface"

`src/api/**` (OpenAPI schema) · `src/features/tools/**` (tool defs + handlers) ·
`src/server/**` (MCP server) · `src/tdClient/**` (TD HTTP client) ·
`src/transport/**` (stdio/HTTP transport) · `td/modules/mcp/**` (TD-side Python API).

## Step 1 — pick the right suite (by what the change affects)

| Change affects | Suite | Needs live TD (9981)? |
|---|---|---|
| MCP tool **response shape / formatting**, tool registration, manifest | `tests/integration/mcpToolsResponse.test.ts` | No — uses `server.getTool(...)` with mocked client |
| **Client ↔ WebServer behavior** (create/update/delete/exec, TD-side Python) | `tests/integration/touchDesignerClientAndWebServer.test.ts` | **Yes** — real `TouchDesignerClient` over HTTP |
| **HTTP transport** (sessions, `/mcp`, `/health`) | `tests/integration/httpTransport.test.ts` | No live TD, but starts the HTTP server |

If the change spans two categories, cover each in its suite.

## Step 2 — add / update the test

Follow the existing patterns in the chosen file:

- **mcpToolsResponse**: get the tool via `server.getTool(TOOL_NAMES.X)`, invoke its
  handler with a mocked TD client, assert the formatted response shape.
- **touchDesignerClientAndWebServer**: use the shared `tdClient` and the
  `test_base_comp` sandbox (created in `beforeAll`); exercise the real call path,
  then **reconcile against a runtime value** (read it back and compare) rather
  than trusting the response alone. Clean up created nodes.

Prefer reconciliation (compute a value, compare to an invariant) over assertions
that can be satisfied without the behavior actually working.

## Step 3 — run it

```bash
# TD-independent suites:
npx vitest run tests/integration/mcpToolsResponse.test.ts
npx vitest run tests/integration/httpTransport.test.ts

# Live-TD suite (needs TouchDesigner running with the .tox on 9981):
TD_WEB_SERVER_HOST=http://127.0.0.1 TD_WEB_SERVER_PORT=9981 \
  npx vitest run tests/integration/touchDesignerClientAndWebServer.test.ts -t "<your test name>" \
  --hookTimeout=60000 --testTimeout=60000
```

Notes:
- The live-TD suite's `beforeAll` creates a sandbox base COMP; on a **cold**
  connection the default 10s hook timeout can trip — pass `--hookTimeout=60000`.
- To bring up a real TD and load the `.tox`, use the **`touchdesigner-self-debug`** skill.
- A fresh worktree needs `npm install && npm run gen` before the client/schema exist.

## Step 4 — commit & push

Once the test is added and green, commit and push normally. If a change
legitimately needs no integration test (pure refactor, comment, type-only),
push with `SKIP_ITEST_GUARD=1 git push ...` and say why.

## Related

- `touchdesigner-self-debug` — start TD, load the `.tox`, verify TD-side Python.
- Hook: `.claude/hooks/integration-test-guard.mjs` (Node; PreToolUse on `git push`).

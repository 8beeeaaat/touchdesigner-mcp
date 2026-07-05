---
name: release-test-audit
description: >
  Audit whether the unreleased touchdesigner-mcp diff (since the last tag) is
  adequately covered by integration tests before a release is cut. Walks every
  API/MCP surface change in the release range, maps each to the integration suite
  that should cover it, and reports covered / gap / waived per change. Use before
  releasing, when checking release test coverage, or when asked whether the
  release diff "has enough tests". This skill AUDITS coverage across the whole
  release; it delegates HOW to write or run a test to the `integration-test-guard`
  skill. Pairs with `prepare-release` and the `release-manager` agent.
---

# Release test audit

Answer one question for a release: **is every API/MCP surface change in the
unreleased range covered by an integration test?** This is a release-wide
completeness check — broader than the per-push `integration-test-guard` hook,
which only sees one push at a time and can be legitimately skipped commit by
commit. Across a full release those individual skips can add up to a real gap;
this audit catches that.

Scope boundary: this skill **finds gaps**. It does **not** teach how to write a
test — for suite choice, patterns, and run commands, hand off to the
**`integration-test-guard`** skill.

## Step 1 — enumerate the release's surface changes

```bash
LAST_TAG=$(git describe --tags --abbrev=0)
git diff "$LAST_TAG"..HEAD --name-only
```

Keep only files under the **API/MCP surface** (same paths the guard watches):

```
src/api/**            OpenAPI schema
src/features/tools/** tool defs + handlers
src/server/**         MCP server
src/tdClient/**       TD HTTP client
src/transport/**      stdio / HTTP transport
td/modules/mcp/**     TD-side Python API
```

Files outside this set (docs, deps, `.claude/**`, build config, pure types) need
no integration test — list them as **N/A** so the audit is explicit about what it
skipped.

## Step 2 — map each change to the suite that must cover it

| A surface change in… | Expected suite | Live TD (9981)? |
|---|---|---|
| tool **response shape / formatting**, registration, manifest (`src/features/tools/**`, `src/server/**`) | `tests/integration/mcpToolsResponse.test.ts` | No (mocked client) |
| **client ↔ WebServer behavior** — create/update/delete/exec, TD-side Python (`src/tdClient/**`, `td/modules/mcp/**`, contract in `src/api/**`) | `tests/integration/touchDesignerClientAndWebServer.test.ts` | **Yes** |
| **HTTP transport** — sessions, `/mcp`, `/health` (`src/transport/**`) | `tests/integration/httpTransport.test.ts` | No (starts HTTP server) |

A change spanning two rows needs coverage in each row's suite.

## Step 3 — check whether coverage actually exists in the release range

For each surface change, verify a **corresponding** test was added or updated in
the same release range — not just that the suite file exists:

```bash
# Did the expected suite change in this release range at all?
git diff "$LAST_TAG"..HEAD --stat -- tests/integration/

# Inspect what changed in the mapped suite, and confirm it exercises THIS change.
git diff "$LAST_TAG"..HEAD -- tests/integration/<mapped-suite>.test.ts
```

Coverage is real only if the changed suite exercises the changed behavior. A new
endpoint with no new/updated assertion in its suite is a **gap**, even if the
suite file was touched for something else. Prefer reconciliation-style tests
(compute a value, read it back, compare an invariant) over assertions that pass
without the behavior working — flag assertion-only additions as weak coverage.

## Step 4 — report the verdict

Emit a table, one row per Step 1 surface change:

| Changed file/area | Expected suite | Status | Note |
|---|---|---|---|
| `src/api/paths/api/td/server/exec.yml` | touchDesignerClientAndWebServer | **covered** | reconciles stdout/stderr readback |
| `td/modules/mcp/services/node_layout.py` | touchDesignerClientAndWebServer | **gap** | no test for grid auto-align |

Status is one of:

- **covered** — a matching test was added/updated in the range and exercises it.
- **gap** — no matching test, or the suite touched but not for this change.
- **weak** — a test exists but only asserts shape, not behavior (reconcile instead).
- **waived** — genuinely needs no integration test (pure refactor / type-only);
  state why, matching the `SKIP_ITEST_GUARD` rationale the guard would accept.

## Step 5 — close the gaps (delegate)

For every **gap** / **weak** row, hand off to the **`integration-test-guard`**
skill to pick the suite, write the reconciliation test, and run it. Re-run this
audit until every surface change is **covered** or explicitly **waived**. Only
then is the release ready for `prepare-release`.

## Related

- `integration-test-guard` — how to choose/write/run an integration test (this
  skill delegates the writing to it).
- `touchdesigner-self-debug` — bring up a real TD + `.tox` for the live-TD suite.
- `prepare-release` — the release cut that this audit gates.

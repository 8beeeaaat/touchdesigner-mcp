# Version policy & release mechanics

This repo carries **two independent version axes**. Getting the second one wrong
is the single most common release mistake, because `npm version` bumps both.

## Table of contents

- [The two axes](#the-two-axes)
- [Decision: does the API axis move?](#decision-does-the-api-axis-move)
- [Files touched by each axis](#files-touched-by-each-axis)
- [Exact bump procedure](#exact-bump-procedure)
- [Reverting the API axis (the trap)](#reverting-the-api-axis-the-trap)
- [Known issue: server.json SHA256 mismatch](#known-issue-serverjson-sha256-mismatch)

## The two axes

| Axis | What it means | When it moves |
|---|---|---|
| **Package version** | The npm package / MCPB bundle / registry release. Always bumped every release. | **Every** release. |
| **MCP API version** | Compatibility contract between the Node MCP server and the TD-side Python WebServer. Signals to users whether the `.tox` must be re-imported. | **Only** when the server / API contract actually changes. |

The package version is the number in `package.json`. The API version currently
sits at `1.4.3` and moves far less often than the package version.

## Decision: does the API axis move?

Answer this **before** bumping. Inspect the unreleased diff
(`git diff <last-tag>..HEAD --stat`) and ask: *does any change alter the
server/API contract?*

**API axis MOVES** if the diff changes any of:

- `src/api/**` — the OpenAPI schema (request/response shapes, new endpoints, new
  params). A change here is the clearest signal the contract moved.
- `src/features/tools/**` — tool definitions/handlers whose **input or output
  shape** changes (not internal refactors).
- `td/modules/mcp/**` — TD-side Python API behavior that the Node side depends on.
- `src/server/**`, `src/tdClient/**`, `src/transport/**` — protocol/transport
  behavior visible to a client.

**API axis STAYS PUT** (revert it after bumping) if the diff is only:

- Dependency updates, lockfile changes, `npm audit` fixes.
- Build/tooling/codegen-toolchain changes with unchanged generated output.
- Docs, comments, tests, `.claude/**`, CHANGELOG.
- Pure internal refactors that don't change any request/response shape.

When in doubt, look at whether `td/modules/**` generated output or `src/gen/**`
changed. If a **client would behave differently**, the axis moves. If not, revert.

> Cross-check: the same path set defines "API/MCP surface" for the
> `integration-test-guard` hook (`src/api/`, `src/features/tools/`, `src/server/`,
> `src/tdClient/`, `src/transport/`, `td/modules/mcp/`). If the guard would fire,
> the API axis very likely moves.

## Files touched by each axis

**Package axis** (`scripts/syncMcpServerVersions.ts`, run by `npm run version:mcp`):

- `package.json` — `version` (bumped by `npm version` itself)
- `mcpb/manifest.json` — `version`
- `server.json` — top-level `version`, each package entry `version`, the mcpb
  `identifier` download URL (`/download/v<ver>/`), and `fileSha256`

**API axis** (`scripts/syncApiServerVersions.ts`, run by `npm run version:api`):

- `src/api/index.yml` — `info.version`
- `td/modules/utils/version.py` — `MCP_API_VERSION`
- `pyproject.toml` — `version`

`npm version <level>` runs the `version` npm script, which is
`run-p version:*` → **both** `version:api` and `version:mcp` fire. That is why
the API axis needs an explicit revert when it should stay put.

## Exact bump procedure

`version:mcp` reads the freshly built `.mcpb` to compute its SHA256, so the
bundle must be built **first**.

```bash
# 1. Build the MCPB bundle first — version:mcp hashes touchdesigner-mcp.mcpb.
npm run build:mcpb

# 2. Bump. This runs version:api + version:mcp via the `version` script,
#    writing all six version-bearing files. Choose patch/minor/major.
npm version patch --no-git-tag-version
```

`--no-git-tag-version` keeps the commit/tag under the release-PR flow's control
rather than letting npm tag locally. (Confirm the maintainer's preference; the
release lands via a `development → main` PR, and tags historically match the
published `vX.Y.Z`.)

## Reverting the API axis (the trap)

If the [decision](#decision-does-the-api-axis-move) says the API axis stays put,
restore the three API files to their pre-bump values **after** running
`npm version`:

```bash
# Restore API-axis files to the last release's values (they must NOT show the new number).
git checkout HEAD -- src/api/index.yml td/modules/utils/version.py pyproject.toml
# Verify they still read the OLD API version (e.g. 1.4.3), not the new package version.
grep -H version src/api/index.yml pyproject.toml
grep MCP_API_VERSION td/modules/utils/version.py
```

The generated `td/modules/td_server/openapi_server/openapi/openapi.yaml` will
also read the old API version — that is **intended, not stale**.

State the decision explicitly in the CHANGELOG "Changed" entry, e.g.
*"The MCP API version (`src/api/index.yml`, `td/modules/utils/version.py`,
`pyproject.toml`) stays at `1.4.3` since this release contains no server/API
contract changes."*

## Known issue: server.json SHA256 mismatch

`server.json`'s `fileSha256` is computed by `version:mcp` from the **locally**
built `.mcpb`. But `release.yml` **rebuilds** the `.mcpb` after the merge to
`main` and attaches that to the GitHub Release. The zip build is non-deterministic
(embeds timestamps), so the published asset's hash will **not** match the recorded
`fileSha256`. This is a known structural issue (proven on v1.4.7), not something
to "fix" per-release. Treat it as expected. A real fix would require `release.yml`
to write the CI-built hash into `server.json` before publishing to the registry —
propose that as a separate change if asked, don't attempt it inline during a release.

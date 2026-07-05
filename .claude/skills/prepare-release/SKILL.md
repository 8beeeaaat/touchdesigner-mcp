---
name: prepare-release
description: >
  Prepare a new touchdesigner-mcp release: inspect the unreleased diff since the
  last tag, decide independently how the MCP **package version** and the **MCP
  API version** each move (the API axis stays put unless the server/API contract
  changed), write the CHANGELOG entry, bump the six version-bearing files, commit,
  and open the development → main release PR. Use when cutting a release, bumping
  the version, updating the CHANGELOG for a release, or when asked to "release",
  "prepare a release", or "cut vX.Y.Z". Pairs with `release-test-audit` (verify
  integration-test coverage of the release diff first) and the `release-manager`
  agent that orchestrates both.
---

# Prepare release

Cut a release for **touchdesigner-mcp**. The job has one non-obvious core: the
repo has **two independent version axes**, and `npm version` bumps both — the API
axis must be reverted when the release has no server/API contract change. Read
[references/version-policy.md](references/version-policy.md) before touching any
version file.

Land the release via a `development → main` PR (historical flow; PR title is the
version, e.g. `v1.4.13`). Do **not** merge or publish — stop at the opened PR.

## Step 0 — preflight

```bash
git fetch --tags
LAST_TAG=$(git describe --tags --abbrev=0)   # e.g. v1.4.12
git log "$LAST_TAG"..HEAD --oneline           # the unreleased commits
git diff "$LAST_TAG"..HEAD --stat             # the unreleased surfaces
```

If the range is empty, there is nothing to release — stop and say so.

## Step 1 — audit integration-test coverage first

Before writing anything, confirm the release diff is adequately tested. Invoke
the **`release-test-audit`** skill: it walks the API/MCP surface changes in the
unreleased range and reports coverage gaps. Resolve (or consciously waive) gaps
via the `integration-test-guard` skill **before** cutting the release. Don't
bump a release with an untested API/MCP surface change.

## Step 2 — decide the two version axes

Read [references/version-policy.md](references/version-policy.md) and decide,
from the Step 0 diff:

- **Package version** — always bumps. Pick patch / minor / major from the change
  set (features → minor, fixes/deps → patch, breaking → major).
- **MCP API version** — bumps **only** if the diff changes the server/API
  contract (`src/api/**`, contract-changing `src/features/tools/**` or
  `td/modules/mcp/**`, `src/server/**`, `src/tdClient/**`, `src/transport/**`).
  Otherwise it **stays put** and must be reverted after `npm version`.

State the decision out loud before proceeding — it drives both the bump and the
CHANGELOG wording.

## Step 3 — write the CHANGELOG entry

Follow [references/changelog-format.md](references/changelog-format.md). Group the
Step 0 commits into Keep-a-Changelog sections, write impact-first prose, reference
the merged PRs, and include the mandatory "Released version … across …" bullet
whose last sentence records the Step 2 API-axis decision.

## Step 4 — bump the version-bearing files

Per [references/version-policy.md](references/version-policy.md):

```bash
npm run build:mcpb                       # must precede version:mcp (it hashes the bundle)
npm version <patch|minor|major> --no-git-tag-version
```

**If the API axis stays put** (Step 2), revert the three API files now:

```bash
git checkout HEAD -- src/api/index.yml td/modules/utils/version.py pyproject.toml
```

Then verify the split is correct:

```bash
grep -H version package.json src/api/index.yml pyproject.toml
grep MCP_API_VERSION td/modules/utils/version.py
# package.json = NEW package version; the API-axis files = OLD API version (unless Step 2 bumped them)
```

> The `server.json` `fileSha256` will not match the CI-rebuilt release asset —
> that mismatch is a known, expected issue. See version-policy.md.

## Step 5 — commit and open the release PR

```bash
git checkout -b <release-branch>   # if not already on the release/development branch
git add -A
git commit -m "release: v<X.Y.Z>"
git push -u origin <release-branch>
gh pr create --base main --title "v<X.Y.Z>" --body "<CHANGELOG excerpt for this version>"
```

Use the new version's CHANGELOG section as the PR body. **Stop here** — the
release is published by CI (`release.yml`) after the maintainer merges to `main`.
Do not merge, tag, or `npm publish` yourself.

## Guardrails

- Never bump the API axis on a deps-only / refactor-only / docs-only release.
- Never edit the six version files by hand — let `npm version` write them, then
  revert the API trio if needed. Hand edits drift from the sync scripts.
- `build:mcpb` **before** `version:mcp`, always.
- Don't "fix" the `server.json` SHA256 mismatch during a release.

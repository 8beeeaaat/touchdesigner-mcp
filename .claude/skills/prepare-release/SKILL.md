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

Two sections bracket the entry (both defined in changelog-format.md):

- **`### Upgrade Notes` first** — required whenever the API axis moves, and
  whenever the release otherwise changes what existing users experience. Derive
  it from the Node-side vs TD-side split of the diff.
- **`### Contributors` last** — credit every human contributor, cross-checking
  commit authors, `Co-Authored-By` trailers, and PR authors (squash merges can
  hide a contributor behind the maintainer's commit email).

## Step 4 — bump the version-bearing files

Per [references/version-policy.md](references/version-policy.md):

```bash
npm run build:mcpb                       # must precede version:mcp (it hashes the bundle)
npm version <patch|minor|major> --no-git-tag-version
```

**If the API axis stays put** (Step 2), revert the three API files and the
`expectedApiVersion` field now:

```bash
git checkout HEAD -- src/api/index.yml td/modules/utils/version.py pyproject.toml
npm pkg set mcpCompatibility.expectedApiVersion=<OLD_API_VERSION>
```

Then verify the split is correct:

```bash
grep -H version package.json src/api/index.yml pyproject.toml
grep MCP_API_VERSION td/modules/utils/version.py
grep -A3 mcpCompatibility package.json
# package.json version = NEW package version; the API-axis files AND
# mcpCompatibility.expectedApiVersion = OLD API version (unless Step 2 bumped them)
```

> The `server.json` `fileSha256` will not match the CI-rebuilt release asset —
> that mismatch is a known, expected issue. See version-policy.md.

## Step 5 — build the PR body, then open the release PR

```bash
git checkout -b <release-branch>   # if not already on the release/development branch
git add -A
git commit -m "release: v<X.Y.Z>"
git push -u origin <release-branch>
```

**Build the body before creating the PR.** `gh pr create --body` takes the body
at creation time, and nothing later in this step edits it — so keywords
collected afterwards never reach GitHub, which is the exact failure this step
exists to prevent.

The body is the new version's CHANGELOG section plus **one closing keyword per
issue this release resolves**. Collect the keywords the range already claims:

```bash
git log "$LAST_TAG"..HEAD --format='%B' \
  | grep -oiE '(close[sd]?|fixe?[sd]?|resolve[sd]?) +#[0-9]+' | sort -u
```

That catches only what somebody already wrote a keyword for. Cross-check it
against the issues the CHANGELOG entry cites, because a bug fixed in the range
may never have had one written anywhere — `#220` in v2.1.0 did not, and stayed
open through the release. Cut the entry out once, into the body file, and read
the citations back off it:

```bash
# Read the version back out of package.json rather than retyping it — by this
# point Step 4 has written it, and an empty variable here makes the pattern
# match nothing, which is indistinguishable from "the entry cites no issues".
NEW_VERSION=$(node -p "require('./package.json').version")

# The CHANGELOG entry for this version, stopping at the next version heading.
awk -v v="## [$NEW_VERSION]" '
  index($0, v) == 1 { on = 1; print; next }
  on && /^## \[/ { exit }
  on { print }
' CHANGELOG.md > /tmp/release-pr-body.md

grep -oE 'issues/[0-9]+' /tmp/release-pr-body.md | sort -u
```

Reconcile the two lists by hand — a cited issue is not automatically a closed
one. On v2.1.0 the range claimed `#221`, `#226` and `#228`; the entry cited
those plus `#219` and `#220`. `#220` was fixed and needed the keyword nobody had
written, while `#219` was cited as *still open* and must not get one.

Append the reconciled keywords to the same file, then create the PR from it:

```bash
cat >> /tmp/release-pr-body.md <<'KEYWORDS'

Closes #220
Closes #226
Closes #228
KEYWORDS

gh pr create --base main --title "v$NEW_VERSION" --body-file /tmp/release-pr-body.md
```

`Closes #226 and #228` does not work: GitHub closes the first and ignores the
rest. Every issue needs its own keyword.

If the PR already exists — a re-run, or someone opened it early — put the same
file through `gh pr edit <number> --body-file /tmp/release-pr-body.md`. Printing
the keywords without writing them anywhere leaves the issues open.

> **Why the body rather than the commits.** A release PR squash-merges into a
> single commit whose message is every commit in the range concatenated, and
> GitHub stops parsing closing keywords partway through a message that large.
> Measured on v2.1.0, whose squashed message ran to 107,513 bytes: `Closes #221`
> at byte 52,521 fired, `Closes #228` at byte 78,390 and `Closes #226` at byte
> 79,538 did not — a cut-off consistent with 64 KiB. The PR body is parsed
> separately and is not subject to that.

**Stop here** — the release is published by CI (`release.yml`) after the
maintainer merges to `main`. Do not merge, tag, or `npm publish` yourself.

Once the maintainer has merged, check that the issues actually closed
(`gh issue list --state open`) and close any stragglers by hand with a comment
naming the release. Silence here looks exactly like success.

## Guardrails

- Never bump the API axis on a deps-only / refactor-only / docs-only release.
- Never edit the six version files by hand — let `npm version` write them, then
  revert the API trio if needed. Hand edits drift from the sync scripts.
- `build:mcpb` **before** `version:mcp`, always.
- Closing keywords belong in the release PR **body**, and must be in the body
  passed to `gh pr create` (or written back with `gh pr edit --body-file`) —
  collecting them after the PR exists changes nothing. Buried in the squashed
  commit message they are past the size GitHub will read, and the issues stay
  open with nothing reporting it.
- Don't "fix" the `server.json` SHA256 mismatch during a release.

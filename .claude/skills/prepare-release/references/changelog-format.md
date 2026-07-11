# CHANGELOG entry format

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

+ SemVer. Match the existing entries exactly — they have a house style.

## Entry skeleton

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Upgrade Notes
- <what existing users must know/do — see rule below>

### Added
- <new user-facing capability>

### Changed
- <behavior/config change>

### Fixed
- <bug fix, impact-first>

### Removed
- <deleted code/feature>

### Security
- <vuln/audit resolution>

### Technical
- **Dependency Updates**: <what & why>
  - `pkg` old → new

### Contributors
- [@login](https://github.com/login) — <contribution> ([#N](https://github.com/8beeeaaat/touchdesigner-mcp/pull/N))
```

Include only the sections that apply, in the order above (Upgrade Notes first,
then Added, Changed, Fixed, Removed, Security, Technical, Contributors last).
Put the newest entry at the top of the file.

## House-style rules (observed across 1.4.x)

+ **One entry per release**, dated with the release date.
+ **Impact-first prose.** Each bullet explains *what changed and why it matters
  to a user*, not just the mechanical diff. Fixes describe the symptom that is
  gone. Full sentences, not terse fragments.
+ **Reference issues/PRs** inline when they exist:
  `([#173](https://github.com/8beeeaaat/touchdesigner-mcp/issues/173), [#181](https://github.com/8beeeaaat/touchdesigner-mcp/pull/181))`.
  Derive numbers from the merged PRs in the unreleased range (`git log <tag>..HEAD`,
  the `(#NNN)` suffixes on squash-merge subjects).
+ **Every release carries a "Changed" bullet stating the version was released
  across the package files, and whether the API axis moved.** Use this template,
  substituting the numbers (see `version-policy.md` for the axis decision):

  > Released version `X.Y.Z` across package metadata (`package.json`), MCP bundle
  > manifest (`mcpb/manifest.json`), and server registry metadata (`server.json`),
  > including the updated MCPB download URL and checksum so npm and MCPB
  > installations resolve the same release. The MCP API version
  > (`src/api/index.yml`, `td/modules/utils/version.py`, `pyproject.toml`) stays
  > at `A.B.C` since this release contains no server/API contract changes.

  If the API axis **does** move this release, replace the last sentence with a
  statement that the API version was bumped to the new number because the
  server/API contract changed (and note that users must re-import the `.tox`).

+ **Dependency updates** go under `### Technical` as a `**Dependency Updates**:`
  bullet with an indented `old → new` list. If there are none, say so explicitly
  ("No dependency updates are included.").
+ **Upgrade Notes lead the entry** whenever the release changes what existing
  users experience — mandatory when the API axis moves (introduced in 1.5.0).
  Readers want "do I have to do anything?" answered first, so this section goes
  before `### Added`. Derive it from the Node-side / TD-side split of the diff:
  - The server side self-updates: the documented config is
    `npx -y touchdesigner-mcp-server@latest`, so users pick the release up on
    the next MCP client restart. Same-major/newer-minor against an older `.tox`
    is **not** a failure — the version handshake continues and appends an
    "Update Recommended" notice to every tool response
    (see `src/core/compatibility.ts`).
  - List what works **without** re-importing the `.tox`: Node-side-only changes
    (formatter/client fixes, tools routed through the existing
    `execute_python_script` channel).
  - List what **requires** re-importing `td/mcp_webserver_base.tox`: anything
    under `td/modules/**` — those files are baked into the `.tox`.
  - Note hard rejections: components older than
    `mcpCompatibility.minApiVersion` (`package.json`) are refused at connection
    time.
  Verify the split against the actual compatibility policy in
  `src/core/compatibility.ts` instead of assuming it.
+ **Contributors close the entry** (introduced in 1.5.0). Credit every human
  contributor in the release range as
  `- [@login](https://github.com/login) — <contribution> ([#N](…/pull/N))`.
  Identify contributors by cross-checking **three** sources — commit authors
  (`git log --format='%an %ae'`), `Co-Authored-By` trailers, and the PR author
  (`gh pr view <n> --json author`) — because squash merges can land a
  contributor's PR under the maintainer's commit email. Exclude bots and
  AI-assistant co-author trailers.

## Deriving the content from the diff

1. `git log <last-tag>..HEAD --oneline` → group commits by Keep-a-Changelog category.
2. `git diff <last-tag>..HEAD --stat` → sanity-check which surfaces changed
   (feeds the API-axis decision in `version-policy.md`).
3. Read the PR bodies for the impact wording when a commit subject is terse.
4. Write user-facing prose; drop pure-noise commits (formatting-only, merge commits).

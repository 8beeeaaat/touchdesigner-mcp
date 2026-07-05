#!/usr/bin/env bash
# PreToolUse(Bash) guard: block `git push` when the outgoing commits change
# MCP/API source without an accompanying integration test change.
#
# Checked at push time (not commit time) so the gate fires once, right before
# the work is shared, over the whole set of commits being pushed.
#
# Escape hatch: prefix the push with SKIP_ITEST_GUARD=1 (or set it in the env)
# when the change genuinely needs no integration test.
#
# Exit codes: 0 = allow, 2 = block and feed stderr back to Claude.
set -euo pipefail

input=$(cat)

# Extract the bash command being run from the PreToolUse payload.
cmd=$(printf '%s' "$input" | /usr/bin/python3 -c \
  'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' \
  2>/dev/null || true)

# Only act on git push.
case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

# Skip branch/tag deletions and tag pushes; explicit opt-out.
case "$cmd" in
  *--delete*|*--tags*) exit 0 ;;
  *SKIP_ITEST_GUARD*) exit 0 ;;
esac
[ "${SKIP_ITEST_GUARD:-}" = "1" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}"

# Determine the base of the outgoing range (what this push will add).
base=""
if up=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null); then
  base="$up"                                   # existing tracking branch
elif git rev-parse --verify -q origin/main >/dev/null 2>&1; then
  base=$(git merge-base origin/main HEAD 2>/dev/null || true)   # new branch
fi
# Can't determine what's outgoing → don't block.
[ -z "$base" ] && exit 0

changed=$(git diff --name-only "$base"..HEAD 2>/dev/null || true)
[ -z "$changed" ] && exit 0

# Source paths that make up the MCP server / API surface for this repo.
api_re='^(src/api/|src/features/tools/|src/server/|src/tdClient/|src/transport/|td/modules/mcp/)'
itest_re='^tests/integration/'

if printf '%s\n' "$changed" | grep -Eq "$api_re" \
   && ! printf '%s\n' "$changed" | grep -Eq "$itest_re"; then
  {
    echo "⛔ integration-test-guard: outgoing commits change MCP/API source without an integration test."
    echo ""
    echo "Changed API/MCP files in this push:"
    printf '%s\n' "$changed" | grep -E "$api_re" | sed 's/^/  - /'
    echo ""
    echo "Add or update a test under tests/integration/ (run the integration-test-guard skill),"
    echo "commit it, and push again — or, if this change truly needs no integration test,"
    echo "re-run the push with SKIP_ITEST_GUARD=1 prefixed."
  } >&2
  exit 2
fi

exit 0

#!/bin/bash
# PostToolUse hook: fires after a TouchDesigner-mutating MCP tool call.
# Injects a reminder into Claude's context (via hookSpecificOutput.additionalContext)
# so the change is verified instead of assumed correct.
set -euo pipefail

# Consume hook input JSON from stdin (content not needed for a static reminder).
cat > /dev/null

cat <<'EOF'
{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "A TouchDesigner-mutating tool just ran. Verify the change before moving on: check get_td_node_errors on the affected node (or its parent COMP), and confirm the updated parameters or outputs match the intent. For visual changes to a TOP chain, consider get_top_image to confirm the rendered result."}}
EOF

#!/bin/sh
set -e

TRANSPORT="${TRANSPORT:-manual}"
TD_HOST="${TD_HOST:-http://host.docker.internal}"
TD_PORT="${TD_PORT:-9981}"

if [ "$TRANSPORT" = "http" ]; then
  if [ -z "${MCP_HTTP_PORT:-}" ]; then
    echo "MCP_HTTP_PORT must be set when TRANSPORT=http" >&2
    exit 1
  fi

  MCP_HTTP_HOST="${MCP_HTTP_HOST:-0.0.0.0}"

  exec node dist/cli.js \
    "--mcp-http-port=${MCP_HTTP_PORT}" \
    "--mcp-http-host=${MCP_HTTP_HOST}" \
    "--host=${TD_HOST}" \
    "--port=${TD_PORT}"
fi

# Default behavior keeps the container alive for manual stdio execution
exec tail -f /dev/null

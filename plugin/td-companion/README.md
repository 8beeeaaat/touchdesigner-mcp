# td-companion

A Claude Code plugin that turns Claude into a TouchDesigner companion: it bundles the [touchdesigner-mcp](https://github.com/8beeeaaat/touchdesigner-mcp) server, TouchDesigner expertise skills, and ready-made commands for setup, debugging, visual confirmation, project overview, and performance diagnosis.

## What you get

| Layer | Component | Purpose |
|---|---|---|
| Tools | Bundled MCP server (`touchdesigner`) | 14 tools to inspect and control a live TouchDesigner project (create nodes, set parameters, run Python, capture TOP images, …) |
| Knowledge | `td-fundamentals`, `td-python-api`, `td-glsl`, `td-recipes`, `td-performance` | Auto-loaded expertise: operator families, TD Python discipline, GLSL TOP dialect, network recipes, optimization |
| Commands | `/td-companion:td-launch [tox-path]` | Launch TouchDesigner with the MCP component imported, wait until connected |
| | `/td-companion:td-setup` | Verify / repair the TouchDesigner connection |
| | `/td-companion:td-debug [node-path]` | Systematic node error investigation |
| | `/td-companion:td-snapshot [top-path]` | Capture and review a TOP's rendered output |
| | `/td-companion:td-overview [root-path]` | Structured report of the project network |
| | `/td-companion:td-perf [root-path]` | Measure cook times and get an optimization plan |
| Automation | PostToolUse hook | After any network-mutating tool call, reminds Claude to verify node errors instead of assuming success |

## Prerequisites

- **Node.js 20+** (the bundled MCP server runs via `npx`)
- **TouchDesigner** with the `mcp_webserver_base.tox` component imported into your project (drag it into `/project1`). Get the `.tox` from the [touchdesigner-mcp repository](https://github.com/8beeeaaat/touchdesigner-mcp) — see its [installation guide](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/docs/installation.md).
- TouchDesigner's WebServer DAT listening on the default `http://127.0.0.1:9981`

## Installation

Install from your plugin marketplace, or test locally:

```bash
claude --plugin-dir /path/to/td-companion
```

On first use, run `/td-companion:td-setup` to confirm the connection end to end.

## Usage

Start TouchDesigner, open a project containing `mcp_webserver_base.tox`, then talk to Claude:

- "Build an audio-reactive feedback loop in /project1" — the recipe and fundamentals skills guide the build, and the hook keeps every change verified.
- "Why is my glsl1 TOP black?" — `/td-companion:td-debug /project1/glsl1`
- "Show me what the output looks like" — `/td-companion:td-snapshot`
- "My project dropped to 20 fps" — `/td-companion:td-perf`

## Configuration

The bundled server targets TouchDesigner on `http://127.0.0.1:9981`. If your WebServer DAT uses a different host or port, override the server in your project's `.mcp.json` (project config takes precedence over the plugin's):

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "npx",
      "args": ["-y", "touchdesigner-mcp-server@^2", "--stdio", "--host=http://127.0.0.1", "--port=9981"]
    }
  }
}
```

## Troubleshooting

| Symptom | Check |
|---|---|
| `get_td_info` fails / tools time out | TouchDesigner running? `.tox` imported? WebServer DAT active on 9981? Run `/td-companion:td-setup` |
| Tools missing in `/mcp` | Restart Claude Code after enabling the plugin; check `npx` can reach the npm registry |
| Snapshot is black | Upstream node errors (`/td-companion:td-debug`), or the TOP has zero resolution |

## License

MIT — same as [touchdesigner-mcp](https://github.com/8beeeaaat/touchdesigner-mcp).

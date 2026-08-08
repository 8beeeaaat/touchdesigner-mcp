# td-companion

A Claude Code plugin that makes the [touchdesigner-mcp](https://github.com/8beeeaaat/touchdesigner-mcp) server easy to drive: it bundles and preconfigures the server, adds ready-made commands for setup, debugging, visual confirmation, project overview, and cook-time measurement, and teaches Claude the conventions those tools expect.

It deliberately does **not** ship TouchDesigner craft knowledge — shader dialects, effect recipes, optimization theory. That material rots against each TouchDesigner release and cannot be verified by this repository's tests; for anything TD-specific the server's own `get_td_classes` / `get_td_class_details` / `get_td_module_help` tools read it live from the running instance instead.

## What you get

| Layer | Component | Purpose |
|---|---|---|
| Tools | Bundled MCP server (`touchdesigner`) | 14 tools to inspect and control a live TouchDesigner project (create nodes, set parameters, run Python, capture TOP images, …) |
| Conventions | `td-fundamentals`, `td-python-api` | Auto-loaded: the operator-family model, the node paths and `nodeType` naming the tools expect, and the lookup ladder that resolves TD Python APIs through `get_td_classes` / `get_td_class_details` / `get_td_module_help` instead of guessing |
| Commands | `/td-companion:td-launch [tox-path]` | Launch TouchDesigner with the MCP component imported, wait until connected |
| | `/td-companion:td-setup` | Verify / repair the TouchDesigner connection |
| | `/td-companion:td-debug [node-path]` | Systematic node error investigation |
| | `/td-companion:td-snapshot [top-path]` | Capture and review a TOP's rendered output |
| | `/td-companion:td-overview [root-path]` | Structured report of the project network |
| | `/td-companion:td-perf [root-path]` | Measure per-operator cook times and rank the slowest |
| Automation | SessionStart + PostToolUse hooks | Injects the configured TD endpoint into Claude's context, then reminds Claude to verify every network mutation |

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

- "Add a noise TOP feeding a level TOP under /project1" — the fundamentals skill keeps the node paths and `nodeType` names right, and the hook keeps every change verified.
- "Why is my glsl1 TOP black?" — `/td-companion:td-debug /project1/glsl1`
- "Show me what the output looks like" — `/td-companion:td-snapshot`
- "My project dropped to 20 fps" — `/td-companion:td-perf`

## Configuration

The plugin asks for the TouchDesigner WebServer host and port when it is enabled. The defaults are `http://127.0.0.1` and `9981`. These values configure the bundled server directly, so its `mcp__plugin_td-companion_touchdesigner__...` tool namespace stays unchanged.

A SessionStart hook reads the same options from `CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_HOST` / `CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_PORT` and injects the resolved endpoint into Claude's context for the setup and launch skills.

When installing from a marketplace with the CLI, the same options can be supplied explicitly:

```bash
claude plugin install td-companion@<marketplace-name> \
  --config touchdesigner_host=http://192.168.1.100 \
  --config touchdesigner_port=9982
```

After changing the plugin configuration, run `/reload-plugins` or start a new Claude Code session before retrying the connection. Do not add a second project-scoped `touchdesigner` MCP server: it receives a different tool namespace and does not replace the bundled server used by these skills.

## Troubleshooting

| Symptom | Check |
|---|---|
| `get_td_info` fails / tools time out | TouchDesigner running? `.tox` imported? WebServer DAT active on the configured port? Run `/td-companion:td-setup` |
| Tools missing in `/mcp` | Restart Claude Code after enabling the plugin; check `npx` can reach the npm registry |
| Snapshot is black | Upstream node errors (`/td-companion:td-debug`), or the TOP has zero resolution |

## License

MIT — same as [touchdesigner-mcp](https://github.com/8beeeaaat/touchdesigner-mcp).

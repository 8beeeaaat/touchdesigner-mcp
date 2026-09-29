# TouchDesigner MCP

A Claude Code plugin that connects Claude to a live TouchDesigner project through the [touchdesigner-mcp](https://github.com/8beeeaaat/touchdesigner-mcp) server: it starts and preconfigures the server, adds ready-made commands for setup, debugging, visual confirmation, project overview, and cook-time measurement, and teaches Claude the conventions those tools expect.

This is a community project. It is not affiliated with, endorsed by, or sponsored by Derivative, the maker of TouchDesigner; "TouchDesigner" is a trademark of Derivative Inc.

It deliberately does **not** ship TouchDesigner craft knowledge — shader dialects, effect recipes, optimization theory. That material rots against each TouchDesigner release and cannot be verified by this repository's tests; for anything TD-specific the server's own `get_td_classes` / `get_td_class_details` / `get_td_module_help` tools read it live from the running instance instead.

## What you get

| Layer | Component | Purpose |
|---|---|---|
| Tools | MCP server (`touchdesigner`), started with `npx` | 14 tools to inspect and control a live TouchDesigner project (create nodes, set parameters, run Python, capture TOP images, …) |
| Conventions | `fundamentals`, `python-api` | Auto-loaded: the operator-family model, the node paths and `nodeType` naming the tools expect, and the lookup ladder that resolves TD Python APIs through `get_td_classes` / `get_td_class_details` / `get_td_module_help` instead of guessing |
| Commands | `/touchdesigner:launch [tox-path]` | Launch TouchDesigner with the MCP component imported, wait until connected |
| | `/touchdesigner:setup` | Verify / repair the TouchDesigner connection |
| | `/touchdesigner:debug [node-path]` | Systematic node error investigation |
| | `/touchdesigner:snapshot [top-path]` | Capture and review a TOP's rendered output |
| | `/touchdesigner:overview [root-path]` | Structured report of the project network |
| | `/touchdesigner:perf [root-path]` | Measure per-operator cook times and rank the slowest |
| Automation | SessionStart + PostToolUse hooks | Injects the configured TD endpoint into Claude's context, then reminds Claude to verify every network mutation |

## Where it works

The TouchDesigner tools come from a local MCP server, so the plugin needs a Claude app that can start programs on the machine running TouchDesigner:

- **Claude Code** (terminal, IDE extensions, desktop Code tab): everything loads.
- **Cowork**: skills, hooks, and the MCP server load when the Cowork session runs on your computer.
- **Chat** on claude.ai, desktop, or mobile: only the skills load. Chat does not start local MCP servers or run hooks, so the TouchDesigner tools are unavailable there.

## Prerequisites

- **Node.js** 22.18+, 24.x or 26+ — odd-numbered releases such as 23.x and 25.x are not supported (the MCP server runs via `npx`)
- **TouchDesigner** with the `mcp_webserver_base.tox` component imported into your project (drag it into `/project1`). Get the `.tox` from the [touchdesigner-mcp repository](https://github.com/8beeeaaat/touchdesigner-mcp) — see its [installation guide](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/docs/installation.md) — or let `/touchdesigner:launch` fetch it.
- TouchDesigner's WebServer DAT listening on the default `http://127.0.0.1:9981`

## Installation

The plugin ships from this repository's own marketplace:

```bash
claude plugin marketplace add 8beeeaaat/touchdesigner-mcp
claude plugin install touchdesigner@touchdesigner-mcp
```

A copy added from Anthropic's plugin directory on claude.ai reaches Claude Code as a synced plugin instead.

Start a new Claude Code session, then run `/touchdesigner:setup` to confirm the connection end to end.

To try a local checkout instead of the published marketplace:

```bash
claude --plugin-dir /path/to/touchdesigner
```

For Codex and ChatGPT, install the ready-to-use OpenAI package from this repository's Codex marketplace instead; see the [Codex / ChatGPT guide](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/docs/openai-plugin.md).

## Usage

Start TouchDesigner, open a project containing `mcp_webserver_base.tox`, then talk to Claude:

- "Add a noise TOP feeding a level TOP under /project1" — the fundamentals skill keeps the node paths and `nodeType` names right, and the hook keeps every change verified.
- "Why is my glsl1 TOP black?" — `/touchdesigner:debug /project1/glsl1`
- "Show me what the output looks like" — `/touchdesigner:snapshot`
- "My project dropped to 20 fps" — `/touchdesigner:perf`

## Configuration

The plugin asks for the TouchDesigner WebServer host and port when it is enabled. The defaults are `http://127.0.0.1` and `9981`. The host is the scheme and hostname only — no port, path, or trailing slash — because the server appends the port itself. These values configure the plugin's server directly, so its `mcp__plugin_touchdesigner_touchdesigner__...` tool namespace stays unchanged.

A SessionStart hook reads the same options from `CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_HOST` / `CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_PORT` and injects the resolved endpoint into Claude's context for the setup and launch skills.

When installing from a marketplace with the CLI, the same options can be supplied explicitly:

```bash
claude plugin install touchdesigner@<marketplace-name> \
  --config touchdesigner_host=http://192.168.1.100 \
  --config touchdesigner_port=9982
```

After changing the plugin configuration, run `/reload-plugins` or start a new Claude Code session before retrying the connection. Do not add a second project-scoped `touchdesigner` MCP server: it receives a different tool namespace and does not replace the plugin's server used by these skills.

## What the plugin runs, sends, and stores

- **MCP server.** Claude Code runs `npx -y touchdesigner-mcp-server@<version>`, with npm's project prefix set to the plugin directory; `.mcp.json` pins `<version>` to the exact release published from the same commit. The first launch downloads that version of [touchdesigner-mcp-server](https://www.npmjs.com/package/touchdesigner-mcp-server) and its dependencies from the npm registry your npm configuration uses (`registry.npmjs.org` by default), and npm keeps them in its cache. The package is built from this repository. The server talks to Claude Code over stdio and sends HTTP requests only to the TouchDesigner WebServer at the configured host and port. It contacts no other service.
- **What the tools can do in TouchDesigner.** They read the node network, parameters, errors, and rendered TOP images; create, change, and delete nodes; and run Python inside TouchDesigner (`execute_python_script`, `exec_node_method`). Python run this way has the same access to your machine as TouchDesigner itself. Claude Code asks before each tool call unless your permission settings allow it.
- **Hooks.** At session start, `node` runs `hooks/scripts/td-config-context.mjs`, which reads this plugin's `plugin.json` and the two `CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_*` variables and prints the configured endpoint into Claude's context. After a tool call that changes the TouchDesigner network, `bash` runs `hooks/scripts/td-verify-reminder.sh`, which prints a fixed reminder to verify the change. Neither hook reads other files, makes network requests, or writes anything.
- **`/touchdesigner:launch`.** When TouchDesigner is not reachable, Claude looks for `mcp_webserver_base.tox` at the path you give, in `~/Downloads`, in `~/Documents`, and in the current project. If none is found, it downloads `touchdesigner-mcp-td.zip` from the [latest release of this repository](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest) with `curl`, unzips it under `~/Documents/touchdesigner-mcp/`, and opens the `.tox` with TouchDesigner (`open -a TouchDesigner` on macOS, PowerShell `Start-Process` on Windows). These run as ordinary Claude Code shell commands under your permission settings.
- **Other skills** only tell Claude how to use the tools. `skills/fundamentals/scripts/dump_operator_pars.py` is Python that Claude may send to TouchDesigner through `execute_python_script`; it only reads operator parameter metadata.

## Privacy

- **Data collection.** Neither the plugin nor its server collects personal data, runs telemetry or analytics, or sends anything to the author.
- **Use and storage.** What the tools read from TouchDesigner — node names, parameters, errors, script output, and TOP images — is returned to Claude as tool results and becomes part of your conversation, which Anthropic handles under the [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy). The plugin stores nothing of its own.
- **Third-party sharing.** None. The only network destinations are the npm registry (server download), GitHub (the `.tox` download in `/touchdesigner:launch`), and your TouchDesigner WebServer.
- **Retention.** The plugin keeps no data. Uninstalling it removes its files; npm's cache and, if `/touchdesigner:launch` downloaded it, `~/Documents/touchdesigner-mcp/` remain until you delete them.
- **Contact.** Open an issue at [github.com/8beeeaaat/touchdesigner-mcp/issues](https://github.com/8beeeaaat/touchdesigner-mcp/issues) or email 8beeeaaat@gmail.com.

## Troubleshooting

| Symptom | Check |
|---|---|
| `get_td_info` fails / tools time out | TouchDesigner running? `.tox` imported? WebServer DAT active on the configured port? Run `/touchdesigner:setup` |
| Tools missing in `/mcp` | Restart Claude Code after enabling the plugin; check `npx` can reach the npm registry |
| `claude mcp list` shows `CONNECTION_CLOSED` only when the session runs inside the touchdesigner-mcp checkout | The checkout's own `package.json` is `touchdesigner-mcp-server`, so an older plugin's `npx` skipped the install and found no bin. Update the plugin (`claude plugin update touchdesigner@touchdesigner-mcp`), which passes `--prefix=${CLAUDE_PLUGIN_ROOT}` to `npx` |
| Snapshot is black | Upstream node errors (`/touchdesigner:debug`), or the TOP has zero resolution |

## License

MIT — same as [touchdesigner-mcp](https://github.com/8beeeaaat/touchdesigner-mcp).

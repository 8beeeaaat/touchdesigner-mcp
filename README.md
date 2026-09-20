# TouchDesigner MCP

[![Version](https://img.shields.io/npm/v/touchdesigner-mcp-server?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)
[![Downloads](https://img.shields.io/npm/dt/touchdesigner-mcp-server.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)

This is an implementation of an MCP (Model Context Protocol) server for TouchDesigner. Its goal is to enable AI agents to control and operate TouchDesigner projects.

[English](README.md) / [日本語](README.ja.md)

## Quick start: install the plugin (recommended)

**New to MCP? If you use Claude Code or Codex, start with the `touchdesigner` plugin.** Your AI client configures and starts the MCP server for you. You do not need to write MCP configuration JSON, clone this repository, or run an npm build.

1. Install **TouchDesigner** and **Node.js 22.18+, 24.x, or 26+** on your computer.
2. Install the plugin using the commands for your client below.
3. Start a new client session and use the launch or setup instructions below. The launch skill can help download the MCP component and open it in TouchDesigner when local shell access is available. To prepare an existing project yourself, download [TouchDesigner Components from the latest release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest), extract the archive, and drag `mcp_webserver_base.tox` into your project. Keep the extracted files together.

### Claude Code users: the touchdesigner plugin

This repository doubles as a Claude Code plugin marketplace. The **touchdesigner** plugin installs this MCP server for you and makes its tools easy to drive:

```bash
claude plugin marketplace add 8beeeaaat/touchdesigner-mcp
claude plugin install touchdesigner@touchdesigner-mcp
```

Then run `/touchdesigner:setup` to verify the connection, or `/touchdesigner:launch` to start TouchDesigner with the component already imported.

Configuration and troubleshooting for the plugin itself live in [plugin/touchdesigner/README.md](plugin/touchdesigner/README.md).

### Codex users: the touchdesigner plugin

Install the **touchdesigner** plugin from this repository's Codex marketplace. No manual npm build is needed:

```bash
codex plugin marketplace add 8beeeaaat/touchdesigner-mcp
codex plugin add touchdesigner@touchdesigner-openai
```

Then ask “Use TouchDesigner setup to check my connection” or “Launch TouchDesigner.” The plugin includes the MCP server and skills for setup, launch, debugging, snapshots, project overviews, and performance measurement.

See the [OpenAI plugin guide](docs/openai-plugin.md) for configuration and ChatGPT connections.

### ChatGPT desktop users (Work / Codex)

For a desktop version with local plugin support, register the marketplace using **Codex CLI** on the same computer:

```bash
codex plugin marketplace add 8beeeaaat/touchdesigner-mcp
```

1. Restart the ChatGPT desktop app.
2. In Work / Codex, open **Plugins Directory** and choose the **TouchDesigner** marketplace source (`touchdesigner-openai`).
3. Install **TouchDesigner**, then start a new local conversation with the plugin enabled and ask “Check my TouchDesigner connection.”

If you already registered the marketplace with Codex CLI, skip re-registration. Local marketplace availability depends on the client and workspace policy. See the [official marketplace guide](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli). For web or cloud conversations, use the [ChatGPT connection setup](docs/openai-plugin.md#chatgpt-connect-the-local-server).

### Other clients and updates

For **Claude Desktop (MCPB)**, other MCP clients, or manual configuration, see the [Installation Guide](docs/installation.md). For **ChatGPT Web**, see the [OpenAI connection guide](docs/openai-plugin.md#chatgpt-connect-the-local-server).

Already using the server? Follow the [update instructions in the latest release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest#for-updates-from-previous-versions).

## Overview

[![demo clip](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/particle_on_youtube.png)](https://youtu.be/V2znaqGU7f4?si=6HDFbcBHCFPdttkM&t=635)

TouchDesigner MCP acts as a bridge between AI models and the TouchDesigner WebServer DAT, enabling AI agents to:

- Create, modify, and delete nodes
- Query node properties and project structure
- Programmatically control TouchDesigner via Python scripts

## MCP Server Features

This server enables AI agents to perform operations in TouchDesigner using the Model Context Protocol (MCP).

### Tools

Tools allow AI agents to perform actions in TouchDesigner.

| Tool Name                | Description                                                        |
| :---------------------- | :----------------------------------------------------------------- |
| `create_td_node`        | Creates a new node.                                                |
| `delete_td_node`        | Deletes an existing node.                                          |
| `describe_td_tools`     | Generates a manifest of the available TouchDesigner tools.         |
| `exec_node_method`      | Calls a Python method on a node.                                   |
| `execute_python_script` | Executes an arbitrary Python script in TouchDesigner.              |
| `get_td_class_details`  | Gets details of a TouchDesigner Python class or module.            |
| `get_td_classes`        | Gets a list of TouchDesigner Python classes.                       |
| `get_td_info`           | Gets information about the TouchDesigner server environment.       |
| `get_td_module_help`    | Gets Python help() documentation for TouchDesigner modules/classes.|
| `get_td_node_errors`    | Checks errors **and warnings** on a node and its descendants. Missing files, dangling references and shader failures are warnings, so no errors does not mean healthy. |
| `get_td_node_parameters`| Gets the parameters of a specific node.                            |
| `get_td_nodes`          | Gets nodes under a parent path, with optional filtering.           |
| `get_top_image`         | Captures the current output of a TOP node as an image.             |
| `update_td_node_parameters` | Updates the parameters of a specific node.                     |

### Prompts

Prompts provide instructions for AI agents to perform specific actions in TouchDesigner.

| Prompt Name         | Description                                                                 |
| :------------------| :-------------------------------------------------------------------------- |
| `Search node`      | Fuzzy searches for nodes and retrieves information based on name, family, or type. |
| `Node connection`  | Provides instructions to connect nodes within TouchDesigner.                |
| `Check node errors`| Checks errors and warnings on a specified node, and recursively for its descendants. |

### Resources

Not implemented.

## Developer Guide

Looking for local setup, client configuration, project structure, or release workflow notes?
See the **[Developer Guide](docs/development.md)** for all developer-facing documentation.

## Troubleshooting

### Troubleshooting version compatibility

The MCP server and the TouchDesigner component are versioned on **two independent axes**: the npm package version and the **API version** (the contract between the MCP server and the `.tox` component). Each release declares the API version it ships with (`expectedApiVersion`) and the minimum it supports (`minApiVersion`, currently 1.3.0). The connected component's API version is compared against those two values — **the npm package version itself never gates compatibility**, so updating the MCP server alone never invalidates a supported component.

| API Server (component) | Condition | Behavior | Status |
|------------------------|-----------|----------|--------|
| = expected API version | Matches the shipped `.tox` | ✅ Works silently | Compatible |
| ≥ minimum, < expected | Older component | ⚠️ "Update Recommended" notice appended to responses, continues | Warning |
| > expected, same MAJOR | Newer component | ⚠️ Warning to update the MCP server, continues | Warning |
| MAJOR above expected | Newer API generation | ❌ Execution stops — update the MCP server | Error |
| < minimum (or missing) | Too old | ❌ Execution stops — update the component | Error |

- **To resolve compatibility errors:**
  1. Download the latest [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip) from the releases page.
  2. Delete the existing `touchdesigner-mcp-td` folder and replace it with the newly extracted contents.
  3. Remove the old `mcp_webserver_base` component from your TouchDesigner project and import the `.tox` from the new folder.
  4. Restart TouchDesigner and the AI agent running the MCP server (e.g., Claude Desktop).

- **For developers:** When developing locally, run `npm run version` after editing `package.json` (or simply use `npm version ...`). This keeps the Python API (`pyproject.toml` + `td/modules/utils/version.py`), `mcpCompatibility.expectedApiVersion`, MCP bundle manifest, and registry metadata in sync so that the runtime compatibility check succeeds.

For a deeper look at how the MCP server enforces these rules, see [Version Compatibility Verification](docs/architecture.md#version-compatibility-verification).

### Troubleshooting connection errors

- `TouchDesignerClient` caches failed connection checks for **60 seconds**. Subsequent tool calls reuse the cached error to avoid spamming TouchDesigner and automatically retry after the TTL expires.
- When the MCP server cannot reach TouchDesigner, you now get guided error messages with concrete fixes:
  - `ECONNREFUSED` / "connect refused": start TouchDesigner, ensure the WebServer DAT from `mcp_webserver_base.tox` is running, and confirm the configured port (default `9981`).
  - `ETIMEDOUT` / "timeout": TouchDesigner is responding slowly or the network is blocked. Restart TouchDesigner/WebServer DAT or check your network connection.
  - `ENOTFOUND` / `getaddrinfo`: the host name is invalid. Use `127.0.0.1` unless you explicitly changed it.
- The structured error text is also logged through `ILogger`, so you can check the MCP logs to understand why a request stopped before hitting TouchDesigner.
- Once the underlying issue is fixed, simply run the tool again—the client clears the cached error and re-verifies the connection automatically.

## Contributing

We welcome your contributions!

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Make your changes.
4. Add tests and ensure everything works (`npm test`).
5. Commit your changes (`git commit -m 'Add some amazing feature'`).
6. Push to your branch (`git push origin feature/amazing-feature`).
7. Open a pull request.

Please always include appropriate tests when making implementation changes.

## License

MIT

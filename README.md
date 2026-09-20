# TouchDesigner MCP

[![Version](https://img.shields.io/npm/v/touchdesigner-mcp-server?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)
[![Downloads](https://img.shields.io/npm/dt/touchdesigner-mcp-server.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)

This is an implementation of an MCP (Model Context Protocol) server for TouchDesigner. Its goal is to enable AI agents to control and operate TouchDesigner projects.

[English](README.md) / [日本語](README.ja.md)

## Quick start

TouchDesigner MCP lets an AI assistant look inside a running TouchDesigner project — read the network, build and wire nodes, run Python, check for errors. Setting it up has two steps: add a component to TouchDesigner, then connect the app you talk to AI in.

### Step 1 — Add the component to TouchDesigner

Everyone does this, whichever AI app you use.

1. Download **touchdesigner-mcp-td.zip** from the [latest release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest) and unzip it somewhere you will keep it.
2. Leave the unzipped folder as it is. `mcp_webserver_base.tox` loads the `modules/` folder sitting next to it, so moving the `.tox` file out on its own breaks it.
3. Drag `mcp_webserver_base.tox` into your TouchDesigner project — `/project1` is a good place for it.

A video walkthrough, and how to confirm it loaded, are in the [Installation Guide](docs/installation.md#touchdesigner-setup-required-for-all-methods).

> Using Claude Code or the Codex CLI? You can let the assistant do this instead — in Claude Code run `/touchdesigner:launch`, in Codex just ask it to launch TouchDesigner. Either way it downloads the component and opens TouchDesigner with it already loaded. It starts a fresh project rather than opening one of yours, so follow the steps above for an existing project.

### Step 2 — Connect the app you talk to AI in

| The app you use | How to connect | Terminal needed |
| :--------------- | :-------------- | :-------------- |
| **Claude Desktop** | [Double-click one downloaded file](#claude-desktop) | No |
| **Claude Code** | [Install the `touchdesigner` plugin](#claude-code) | Yes |
| **Codex CLI** | [Install the `touchdesigner` plugin](#codex-cli) | Yes |
| **ChatGPT desktop app** (Work / Codex) | [Register the marketplace with the Codex CLI](#chatgpt-desktop-app-work--codex) | Yes |
| **ChatGPT on the web** | [Connect through a secure tunnel](docs/openai-plugin.md#chatgpt-connect-the-local-server) — advanced | Yes |
| Another MCP client | [Installation Guide](docs/installation.md) | Usually |

"Terminal needed" means you type commands into Terminal (macOS) or PowerShell (Windows). If that is unfamiliar territory, the Claude Desktop route avoids it entirely.

#### Claude Desktop

No terminal, no configuration files to edit.

1. Download **touchdesigner-mcp.mcpb** from the [latest release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp.mcpb).
2. Double-click the file. Claude Desktop installs it as an extension.
3. Restart Claude Desktop, start a new chat, and ask "Check my TouchDesigner connection."

The extension connects to TouchDesigner on port `9981` by default; if your WebServer DAT uses another port, change it in the extension's settings. Details in [Method 1: MCP Bundle](docs/installation.md#method-1-mcp-bundle-claude-desktop-only).

#### Claude Code

Requires **Node.js** — install the current LTS from [nodejs.org](https://nodejs.org/) (22.18+, 24.x or 26+; odd-numbered releases such as 23.x and 25.x are not supported).

This repository doubles as a Claude Code plugin marketplace. The **touchdesigner** plugin installs and configures the MCP server for you, so there is no configuration JSON to write, no repository to clone, and no npm build to run:

```bash
claude plugin marketplace add 8beeeaaat/touchdesigner-mcp
claude plugin install touchdesigner@touchdesigner-mcp
```

Start a new session, then run `/touchdesigner:setup` to verify the connection, or `/touchdesigner:launch` to start TouchDesigner with the component already imported.

Configuration and troubleshooting for the plugin itself live in [plugin/touchdesigner/README.md](plugin/touchdesigner/README.md).

#### Codex CLI

Requires **Node.js** — the current LTS from [nodejs.org](https://nodejs.org/) (22.18+, 24.x or 26+) — and the [Codex CLI](https://developers.openai.com/codex/cli). Install the **touchdesigner** plugin from this repository's Codex marketplace — again, no manual npm build:

```bash
codex plugin marketplace add 8beeeaaat/touchdesigner-mcp
codex plugin add touchdesigner@touchdesigner-openai
```

Start a new session and ask "Check my TouchDesigner connection" or "Launch TouchDesigner." The plugin bundles the MCP server together with skills for setup, launch, debugging, snapshots, project overviews, and performance measurement. Codex has no `/touchdesigner:` slash commands — ask in plain language, or pick a skill from the client's skill picker.

See the [OpenAI plugin guide](docs/openai-plugin.md) for configuration and ChatGPT connections.

#### ChatGPT desktop app (Work / Codex)

The desktop app can use local plugins, but registering one goes through the **Codex CLI**, which is a separate terminal tool and does not ship with the ChatGPT app. Install it from [Codex CLI setup](https://developers.openai.com/codex/cli), then run:

```bash
codex plugin marketplace add 8beeeaaat/touchdesigner-mcp
```

1. Restart the ChatGPT desktop app.
2. In Work / Codex, open **Plugins Directory** and choose the **TouchDesigner** marketplace source (`touchdesigner-openai`).
3. Install the **TouchDesigner** plugin from that source, then start a new local conversation with the plugin enabled and ask "Check my TouchDesigner connection."

If you already registered the marketplace with the Codex CLI, skip the command. Whether local marketplaces appear at all depends on your client version and workspace policy — see the [official marketplace guide](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli). For conversations on the web or in the cloud, use the [ChatGPT connection setup](docs/openai-plugin.md#chatgpt-connect-the-local-server) instead.

### Updating

Already running an earlier version? Follow the [update instructions in the latest release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest#for-updates-from-previous-versions).

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

# TouchDesigner MCP

[![Version](https://img.shields.io/npm/v/touchdesigner-mcp-server?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)
[![Downloads](https://img.shields.io/npm/dt/touchdesigner-mcp-server.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)

This is an implementation of an MCP (Model Context Protocol) server for TouchDesigner. Its goal is to enable AI agents to control and operate TouchDesigner projects.

[English](README.md) / [日本語](README.ja.md)

## Overview

[![demo clip](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/particle_on_youtube.png)](https://youtu.be/V2znaqGU7f4?si=6HDFbcBHCFPdttkM&t=635)

TouchDesigner MCP acts as a bridge between AI models and the TouchDesigner WebServer DAT, enabling AI agents to:

- Create, modify, and delete nodes
- Query node properties and project structure
- Programmatically control TouchDesigner via Python scripts

## Installation

Please refer to the **[Installation Guide](docs/installation.md)**.

If you are updating, please refer to the procedure in the **[Latest Release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest#for-updates-from-previous-versions)**.

### Claude Code users: the td-companion plugin

This repository doubles as a Claude Code plugin marketplace. The **td-companion** plugin installs this MCP server for you and makes its tools easy to drive:

```bash
claude plugin marketplace add 8beeeaaat/touchdesigner-mcp
claude plugin install td-companion@touchdesigner-mcp
```

Then run `/td-companion:td-setup` to verify the connection, or `/td-companion:td-launch` to start TouchDesigner with the component already imported.

| Layer | What it adds |
| :--- | :--- |
| Tools | This MCP server, bundled and preconfigured (host and port are plugin options) |
| Conventions | Auto-loaded skills for the operator-family model, the node paths and `nodeType` naming the tools expect, and resolving TD Python APIs through the lookup tools instead of guessing |
| Commands | `/td-companion:` `td-launch`, `td-setup`, `td-debug`, `td-snapshot`, `td-overview`, `td-perf` |
| Automation | A hook that reminds Claude to verify every network mutation instead of assuming it worked |

Configuration and troubleshooting for the plugin itself live in [plugin/td-companion/README.md](plugin/td-companion/README.md).

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
| `get_td_node_errors`    | Checks for errors on a specified node and its children. |
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
| `Check node errors`| Checks for errors on a specified node, and recursively for its children.    |

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

# TouchDesigner MCP Server Installation Guide

Installation guide for TouchDesigner MCP across different AI agents and platforms.

[English](installation.md) / [日本語](installation.ja.md)

## Quick Start

Most users can get running quickly with the Claude Desktop bundle flow. Download both
`touchdesigner-mcp-td.zip` and `touchdesigner-mcp.mcpb` from the
[latest release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest),
import `mcp_webserver_base.tox` into your TouchDesigner project
(`project1/mcp_webserver_base` is recommended), then double-click the `.mcpb` file to
install it in Claude Desktop. The bundle automatically connects to TouchDesigner once the
component is running.

## Table of Contents

- [Prerequisites](#prerequisites)
- [TouchDesigner Setup (Required for All Methods)](#touchdesigner-setup-required-for-all-methods)
- [MCP Server Installation Methods](#mcp-server-installation-methods)
  - [Method 1: MCP Bundle (Claude Desktop only)](#method-1-mcp-bundle-claude-desktop-only)
  - [Method 2: NPM Package (Claude Code, Codex, and other MCP clients)](#method-2-npm-package-claude-code-codex-and-other-mcp-clients)
  - [Method 3: Docker Container](#method-3-docker-container)
- [HTTP Transport Mode](#http-transport-mode)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **TouchDesigner** (latest version recommended)
- For NPM-based installations: **Node.js** 18.x or later _(not required when you only use Claude Desktop with the MCP bundle)_
- For Docker-based installations: **Docker** and **Docker Compose**

## TouchDesigner Setup (Required for All Methods)

**This step is required regardless of which installation method you choose.**

1. Download [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip) from the latest release
2. Extract the ZIP file
3. Import `mcp_webserver_base.tox` into your TouchDesigner project
4. Place it at `/project1/mcp_webserver_base` (or your preferred location)

<https://github.com/user-attachments/assets/215fb343-6ed8-421c-b948-2f45fb819ff4>

**⚠️ Critical**: Do not delete or modify the directory structure. The `mcp_webserver_base.tox` component uses relative paths to locate the `modules/` directory.

**Directory Structure**:

```text
touchdesigner-mcp-td/
├── import_modules.py          # Module loader
├── mcp_webserver_base.tox     # Main component
└── modules/                   # Python modules
    ├── mcp/                   # Core MCP logic
    ├── utils/                 # Utilities
    └── td_server/             # API server code
```

You can verify successful setup by checking the Textport (Alt+T or Dialogs → Textport):

![Textport](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/textport.png)

## MCP Server Installation Methods

Choose one of the following installation methods based on your AI agent and preferences.
They all assume your TouchDesigner project already contains the imported
`mcp_webserver_base.tox` component from the previous section.

### Method 1: MCP Bundle (Claude Desktop only)

**Best for**: Claude Desktop users who want the simplest installation experience.

#### Downloads

Download the following from the [latest release](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest):

- **TouchDesigner Components**: [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip)
- **MCP Bundle**: [touchdesigner-mcp.mcpb](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp.mcpb)

#### Installation Steps

1. **Prepare TouchDesigner**
   - Complete the [TouchDesigner Setup](#touchdesigner-setup-required-for-all-methods) once per project (import `mcp_webserver_base.tox`, keep the folder layout intact, verify via Textport).

2. **Install the MCP Bundle**
   - Double-click the `touchdesigner-mcp.mcpb` file to install it in Claude Desktop

   <https://github.com/user-attachments/assets/0786d244-8b82-4387-bbe4-9da048212854>

3. **Start Using**
   - The bundle automatically handles the TouchDesigner server connection once the component is running
   - Restart Claude Desktop if the MCP server is not recognized
   - Open the Claude Desktop MCP panel to confirm that `touchdesigner-mcp` is available

### Method 2: NPM Package (Claude Code, Codex, and other MCP clients)

**Best for**: Users who want flexibility across different AI agents or need custom configuration.

#### Installation Prerequisites

- Node.js 18.x or later installed
- TouchDesigner components set up (see [TouchDesigner Setup](#touchdesigner-setup-required-for-all-methods))

Once those prerequisites are in place, add the MCP server to your client using one of the following configurations.

#### For Claude Desktop

Edit your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "npx",
      "args": ["-y", "touchdesigner-mcp-server@latest", "--stdio"]
    }
  }
}
```

_Optional:_ Add `--host` / `--port` arguments if TouchDesigner is not running on the defaults (`http://127.0.0.1:9981`).

#### For Claude Code

Run the following command:

```bash
claude mcp add -s user touchdesigner -- npx -y touchdesigner-mcp-server@latest --stdio
```

Or manually edit `~/.claude.json`:

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "npx",
      "args": ["-y", "touchdesigner-mcp-server@latest", "--stdio"],
    }
  }
}
```

#### For Codex

Run the following command:

```bash
codex mcp add touchdesigner -- npx -y touchdesigner-mcp-server@latest --stdio
```

Or manually edit `~/.codex/config.toml`:

```toml
[mcp_servers.touchdesigner]
command = "npx"
args = ["-y", "touchdesigner-mcp-server@latest", "--stdio"]
```

#### For Other MCP Clients

Any MCP-compatible client can use the NPM package via stdio transport:

- **Command**: `npx`
- **Args**: `["-y", "touchdesigner-mcp-server@latest", "--stdio"]`
- **Optional Args**: `--host=<url>`, `--port=<number>`

Add the optional flags only when TouchDesigner is not running on `http://127.0.0.1:9981`.

### Method 3: Docker Container

**Best for**: Developers, CI/CD pipelines, or users who prefer containerized environments.

#### Docker Prerequisites

- Docker and Docker Compose installed
- TouchDesigner components set up (see [TouchDesigner Setup](#touchdesigner-setup-required-for-all-methods))

#### Installation Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
   cd touchdesigner-mcp
   ```

2. **Build the Docker image**

   ```bash
   make build
   ```

3. **Start the container**

Choose a transport configuration:

##### Option A: Streamable HTTP ([spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#streamable-http))

1. Start the container with HTTP transport:

   ```bash
   TRANSPORT=http docker-compose up -d
   ```

2. (Optional) Override the HTTP port or TouchDesigner host:

   ```bash
   TRANSPORT=http \
   MCP_HTTP_PORT=6280 \
   TD_HOST=http://host.docker.internal \
   docker compose up -d
   ```

3. Point your MCP client to the HTTP endpoint. For example:

- **Claude Code (native HTTP entry):**

    ```json
    {
      "mcpServers": {
        "touchdesigner-http": {
          "type": "http",
          "url": "http://localhost:6280/mcp"
        }
      }
    }
    ```

- **Claude Desktop (via `mcp-remote`):**

    ```json
    {
      "mcpServers": {
        "touchdesigner-http": {
          "command": "npx",
          "args": [
            "mcp-remote",
            "http://localhost:6280/mcp"
          ]
        }
      }
    }
    ```

4. Confirm the container is healthy (container binds `0.0.0.0`, Docker publishes to `127.0.0.1` by default):

   ```bash
   curl http://localhost:6280/health
   ```

##### Option B: Stdio Passthrough

1. Start the container in stdio mode:

   ```bash
   docker-compose up -d
   ```

2. Configure your client to exec into the container (Claude Desktop example):

   ```json
   {
     "mcpServers": {
       "touchdesigner-docker": {
         "command": "docker",
         "args": [
           "compose",
           "-f",
           "/path/to/your/touchdesigner-mcp/docker-compose.yml",
           "exec",
           "-i",
           "touchdesigner-mcp-server",
           "node",
           "dist/cli.js",
           "--stdio",
           "--host=http://host.docker.internal"
         ]
       }
     }
   }
   ```

   _On Windows include the drive letter (for example `C:\\path\\to\\touchdesigner-mcp\\docker-compose.yml`)._

## HTTP Transport Mode

TouchDesigner MCP Server can run as an HTTP endpoint for remote clients, browser-based
integrations, or when you prefer not to rely on stdio. Treat this section as optional—only
follow it if you need HTTP/SSE access instead of stdio. You can start HTTP mode directly
from the Node.js CLI or inside the Docker container.

### Starting in HTTP Mode

```bash
touchdesigner-mcp-server \
  --mcp-http-port=6280 \
  --mcp-http-host=127.0.0.1 \
  --host=http://127.0.0.1 \
  --port=9981
```

### Configuration Options

| Option | Description | Default |
| --- | --- | --- |
| `--mcp-http-port` | HTTP server port (required for HTTP mode) | - |
| `--mcp-http-host` | Bind address (`0.0.0.0` in Docker entrypoint, `127.0.0.1` in CLI) | `127.0.0.1` (CLI) |
| `--host` | TouchDesigner WebServer host | `http://127.0.0.1` |
| `--port` | TouchDesigner WebServer port | `9981` |

> Security tip (Docker): the container binds to `0.0.0.0`, but `docker-compose.yml` publishes `127.0.0.1:${MCP_HTTP_PORT}` by default so the endpoint is loopback-only. If you intentionally expose it to your LAN/WAN, change the compose port mapping (for example `"0.0.0.0:6280:6280"`) and protect it with a firewall/reverse proxy and authentication.

### Health Check

```bash
curl http://localhost:6280/health
```

Expected response:

```json
{
  "status": "ok",
  "sessions": 0,
  "timestamp": "2025-12-06T05:30:00.000Z"
}
```

### Transport Differences

| Feature | stdio | Streamable HTTP |
| --- | --- | --- |
| Connection | Standard I/O | HTTP/SSE |
| Use Case | Local CLI / desktop tools | Remote agents, browser integrations |
| Session Management | Single connection | Multi-session with TTL |
| Port Required | No | Yes |

### Development Shortcut

```bash
# Start HTTP server together with MCP Inspector
# 127.0.0.1:6280/mcp
npm run http
```

## Verification

After installation:

1. Start TouchDesigner with the imported `mcp_webserver_base.tox` component
2. Start your AI agent (Claude Desktop / Claude Code / Codex / etc.)
3. Confirm the `touchdesigner-mcp` server appears in the agent UI

If it does not show up:

- Restart the AI agent
- Make sure TouchDesigner and the WebServer DAT are running
- Review the logs for error messages

Example view inside an agent:

![Nodes List](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/nodes_list.png)

## Troubleshooting

### Version Compatibility Issues

The MCP server enforces semantic versioning. If you see a compatibility warning or error:

1. Repeat the steps in [TouchDesigner Setup](#touchdesigner-setup-required-for-all-methods)
2. Remove the old `mcp_webserver_base` component and import the updated `.tox`
3. Restart both TouchDesigner and your AI agent

See [Troubleshooting version compatibility](https://github.com/8beeeaaat/touchdesigner-mcp#troubleshooting-version-compatibility) in the README for additional details.

### Connection Issues

Refer to [Troubleshooting connection errors](https://github.com/8beeeaaat/touchdesigner-mcp#troubleshooting-connection-errors) in the README for guided error messages (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, etc.).

### Other Issues

- Check [GitHub Issues](https://github.com/8beeeaaat/touchdesigner-mcp/issues) for known reports
- Review the [main README](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/README.md) for more background information

## For Developer Setup

Need developer-focused workflows? See the [Developer Guide](development.md).

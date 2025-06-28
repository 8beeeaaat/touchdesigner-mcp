# TouchDesigner MCP Server Installation Guide (for AI Agents)

This guide explains how to install and configure the TouchDesigner MCP server for use with various AI agents (Cline, Claude Desktop, Cursor, Roo Code, etc.) via the Model Context Protocol (MCP).

---

## Prerequisites

- Docker installed
- TouchDesigner installed

---

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
cd touchdesigner-mcp
```

### 2. Set Up Environment and Build

```bash
cp dotenv .env
make build
```

### 3. Install the API Server in Your TouchDesigner Project

Start TouchDesigner and import the `td/mcp_webserver_base.tox` component directly under the project you want to control.
Example: Place it as `/project1/mcp_webserver_base`.

### 4. Start the MCP Server Container

```bash
docker-compose up -d
```

---

## 5. Configure Your AI Agent

Depending on your client, add the following configuration to the appropriate MCP settings file:

### Configuration File Locations

- **Cline (VS Code Extension):**
  `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Roo Code (VS Code Extension):**
  `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`
- **Claude Desktop:**
  `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor:**
  `[project root]/.cursor/mcp.json`

### Example Configuration

Add or merge the following entry into the `"mcpServers"` section of your settings file:

```json
{
  "mcpServers": {
    "touchdesigner-mcp": {
      "args": [
        "compose",
        "-f",
        "/Users/path/to/your/touchdesigner-mcp/docker-compose.yml",
        "exec",
        "-i",
        "touchdesigner-mcp-server",
        "node",
        "dist/index.js",
        "--stdio"
      ],
      "autoApprove": [],
      "command": "docker",
      "disabled": false
    }
  }
}
```

- **Note:**
  - Adjust the path `/Users/path/to/your/touchdesigner-mcp/docker-compose.yml` as needed for your environment.
  - On Windows systems, include the drive letter like C: e.g. `C:\\path\\to\\your\\touchdesigner-mcp\\docker-compose.yml`

---

## 6. Verify Installation

1. Restart your AI agent (Cline, Claude Desktop, etc.).
2. Test the connection by running a simple MCP tool command (e.g., list nodes or get server info).

---

## Troubleshooting

- **Server not recognized:**
  - Restart both TouchDesigner and the MCP server container.
  - Double-check the settings file path and content.
  - Ensure Docker is running and accessible.

- **JSON parsing errors:**
  - Ensure your settings file is valid JSON (no trailing commas, correct brackets).
  - Use absolute paths for all file references.

- **Other issues:**
  - Check the TouchDesigner Textport for error logs.
  - Consult the [README.md](./README.md) for advanced usage and development options.

---


## Support

For more information, see [README.md](./README.md) or open an issue on the repository.

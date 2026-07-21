# TouchDesigner MCP Server Developer Guide

This guide consolidates all developer-focused content: local environment setup, MCP client
configuration, project structure, code generation workflows, and release/versioning tips. For a
high-level view of components and data flow, see **[Architecture](./architecture.md)**.

## Quick Start for Development

1. **Set up your environment:**

   ```bash
   # Clone and install dependencies
   git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
   cd touchdesigner-mcp
   npm install
   ```

2. **Build the project:**

   ```bash
   make build        # Docker-based build (recommended)
   # OR
   npm run build     # Node.js-based build
   ```

3. **Available commands:**

   ```bash
   npm run test      # Run unit and integration tests
   npm run dev       # Launch the MCP inspector for debugging
   ```

**Note:** When you update the code, restart both the MCP server and TouchDesigner to apply
changes.

## Local MCP Client Configuration

Use these snippets to point your preferred MCP client at a local build of the server.

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "touchdesigner-stdio": {
      "command": "npx",
      "args": [
        "-y",
        "/path/to/your/touchdesigner-mcp/dist/cli.js",
        "--stdio",
        "--port=9981"
      ]
    },
    "touchdesigner-http-npx": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:6280/mcp"
      ]
    }
  }
}
```

### Claude Code (`~/.claude.json`)

```json
{
  "mcpServers": {
    // claude mcp add -s user touchdesigner-stdio -- npx -y /path/to/your/touchdesigner-mcp/dist/cli.js --stdio --port=9981
    "touchdesigner-stdio": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "/path/to/your/touchdesigner-mcp/dist/cli.js",
        "--stdio",
        "--port=9981"
      ],
      "env": {}
    },
    // claude mcp add -s user --transport http touchdesigner-http http://localhost:6280/mcp
    "touchdesigner-http": {
      "type": "http",
      "url": "http://localhost:6280/mcp"
    },
    // claude mcp add -s user touchdesigner-http-npx -- npx mcp-remote http://localhost:6280/mcp
    "touchdesigner-http-npx": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:6280/mcp"
      ],
      "env": {}
    }
  }
}
```

### Codex (`~/.codex/config.toml`)

```toml
# codex mcp add touchdesigner-stdio -- npx -y /path/to/your/touchdesigner-mcp/dist/cli.js --stdio --port=9981
[mcp_servers.touchdesigner-stdio]
command = "npx"
args = ["-y", "/path/to/your/touchdesigner-mcp/dist/cli.js", "--stdio", "--port=9981"]

# codex mcp add touchdesigner-http --url http://localhost:6280/mcp
[mcp_servers.touchdesigner-http]
url = "http://localhost:6280/mcp"

# codex mcp add touchdesigner-http-npx -- npx mcp-remote http://localhost:6280/mcp
[mcp_servers.touchdesigner-http-npx]
command = "npx"
args = ["mcp-remote", "http://localhost:6280/mcp"]
```

### Cursor (`.cursor/mcp.json` or `~/.cursor/mcp.json`)

Prefer a local build of **this fork** (not `npx touchdesigner-mcp-server@latest`) so multi-target and lifecycle tools are available. Use `node` + `dist/cli.js` for stable Windows paths. See also [`mcp.cursor.example.json`](../mcp.cursor.example.json).

**Agents:** read [`docs/AGENT_MCP.md`](AGENT_MCP.md) for sticky targets, 0/1/N workflows, and lifecycle. Do **not** run both this entry and a user-level `npx touchdesigner-mcp-server@latest` TD MCP at the same time — Cursor will expose two overlapping servers.

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "node",
      "args": [
        "/absolute/path/to/touchdesigner-mcp/dist/cli.js",
        "--stdio"
      ]
    }
  }
}
```

## Development Workflow

1. **Clone and install**:

   ```bash
   git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
   cd touchdesigner-mcp
   npm install
   ```

2. **Build**:

   ```bash
   npm run build  # Full build with code generation
   # or
   make build     # Docker-based build
   ```

3. **Test / inspect**:

   ```bash
   npm test       # Run all tests
   npm run dev    # Launch MCP inspector
   ```

See `CLAUDE.md` for additional developer-focused commands.

## Project Structure Overview

```
├── src/                       # MCP server source code
│   ├── api/                  # OpenAPI spec for the TouchDesigner WebServer
│   ├── core/                 # Core utilities (logger, error handling)
│   ├── features/             # MCP feature implementations
│   │   ├── prompts/         # Prompt handlers
│   │   ├── resources/       # Resource handlers
│   │   └── tools/           # Tool definitions & handlers (toolDefinitions.ts, tdTools.ts)
│   ├── gen/                  # Code generated from the OpenAPI schema for the MCP server
│   ├── server/               # MCP server logic (connections, main server class)
│   ├── tdClient/             # TouchDesigner connection API client
│   ├── index.ts              # Main entry point for the Node.js server
│   └── ...
├── td/                        # TouchDesigner-related files
│   ├── modules/              # Python modules for TouchDesigner
│   │   ├── mcp/              # Core logic for handling MCP requests in TouchDesigner
│   │   │   ├── controllers/ # API request controllers (api_controller.py, generated_handlers.py)
│   │   │   └── services/    # Business logic (api_service.py)
│   │   ├── td_server/        # Python model code generated from the OpenAPI schema
│   │   └── utils/            # Shared Python utilities
│   ├── templates/             # Mustache templates for Python code generation
│   ├── genHandlers.js         # Node.js script for generating generated_handlers.py
│   ├── import_modules.py      # Helper script to import API server modules into TouchDesigner
│   └── mcp_webserver_base.tox # Main TouchDesigner component
├── tests/                      # Test code
│   ├── integration/
│   └── unit/
└── orval.config.ts             # Orval config (TypeScript client generation)
```

## API Code Generation Workflow

This project uses OpenAPI-based code generation tools (Orval and `@redocly/cli`).

**API Definition:** The API contract between the Node.js MCP server and the Python server
running inside TouchDesigner is defined in `src/api/index.yml`.

1. **OpenAPI schema bundling (`npm run gen:openapi`):**
    - Uses `@redocly/cli` to resolve all `$ref` references in `src/api/index.yml`.
    - Outputs a single bundled YAML to
      `td/modules/td_server/openapi_server/openapi/openapi.yaml`, which is loaded by the
      Python `OpenAPIRouter` inside TouchDesigner and consumed by the following two steps.
2. **Python handler generation (`npm run gen:handlers`):**
    - Uses a custom Node.js script (`td/genHandlers.js`) and Mustache templates (`td/templates/`).
    - Reads the bundled OpenAPI spec.
    - Generates handler implementations (`td/modules/mcp/controllers/generated_handlers.py`)
      that connect to the business logic in `td/modules/mcp/services/api_service.py`.
3. **TypeScript client generation (`npm run gen:mcp`):**
    - Uses `Orval` to generate an API client (`src/gen/endpoints/`) and Zod schemas
      (`src/gen/mcp/`) for tool validation from the bundled schema YAML.
    - The generated client is consumed by `src/tdClient/` to make requests to the WebServer DAT.

The build process (`npm run build`) runs all necessary generation steps (`npm run gen`), followed
by TypeScript compilation (`tsc`).

## Version Management

- `package.json` is the single source of truth for every component version (Node.js MCP server,
  TouchDesigner Python API, MCP bundle, and `server.json` metadata).
- Run `npm version <patch|minor|major>` (or the underlying `npm run version`) whenever you
  bump the version. The script rewrites `pyproject.toml`, `td/modules/utils/version.py`,
  `mcpb/manifest.json`, and `server.json` so that the release workflow can trust the tag value.
- The GitHub release workflow (`.github/workflows/release.yml`) tags the commit as `v${version}`
  and publishes `touchdesigner-mcp-td.zip` / `touchdesigner-mcp.mcpb` from the exact same version
  number. Always run the sync step before triggering a release so every artifact stays aligned.

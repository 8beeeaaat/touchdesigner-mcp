# TouchDesigner MCP

An evolving Model Context Protocol (MCP) server implementation for TouchDesigner, aiming to enable AI assistants to control and interact with TouchDesigner projects.

## Overview

![スクリーンショット 2025-04-14 21 45 47](https://github.com/user-attachments/assets/b7130ebe-406c-4e05-9efc-5d493eb800cb)


TouchDesigner MCP is a bridge between AI models and TouchDesigner, allowing AI assistants to:
- Create, modify, and delete nodes in TouchDesigner projects
- Query node properties and project structure
- Control TouchDesigner operations programmatically through a standardized protocol

This implementation aims to follow the Model Context Protocol standard, working towards providing a seamless integration between AI models and TouchDesigner's powerful real-time visual development environment.

## Prerequisites

- Node.js (Check `.nvmrc` or `package.json` engines field for specific version if available)
- TouchDesigner (latest stable version recommended)
- Docker (Required for generating Python server code)

## Installation

```bash
# Clone the repository
git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
cd touchdesigner-mcp

# Install dependencies
npm install

# Set up environment configuration
# Copy the template and adjust TD_WEB_SERVER_URL if needed
cp dotenv .env

# Build the project (Generates API clients/servers and compiles TypeScript)
# Ensure Docker daemon is running before executing this command
npm run build
```

## Usage

### Setting Up TouchDesigner

1.  **Generate Code:** Run `npm run build` in the project root. This generates Python server code (`td/modules/td_server/`) and handler code (`td/modules/mcp/controllers/generated_handlers.py`).
2.  **Open TouchDesigner:** Launch TouchDesigner.
3.  **Import Component:** Load the `td/mcp_webserver_base.tox` component into your TouchDesigner project.
4.  **Configure Python Path:** Ensure the Python modules within the `td/modules` directory are accessible to the `mcp_webserver_base` component. This might involve adjusting Python path settings within TouchDesigner or ensuring the `.tox` file correctly references the modules. The `td/import_modules.py` script might assist with this.
5.  **Web Server DAT:** The `mcp_webserver_base.tox` contains a Web Server DAT configured to run the generated Python Flask application. Ensure this DAT is active and running on the port specified by `TD_WEB_SERVER_URL` in your `.env` file (default is `9981`).

> **Note:** The Node.js MCP server (running outside TouchDesigner) communicates with the Python Flask server (running inside TouchDesigner via the Web Server DAT). The `TD_WEB_SERVER_URL` in `.env` tells the Node.js server where to find the Python server.

### Starting the MCP Server

You can start the server using the MCP Inspector for debugging or directly:

```bash
# Start the server with the MCP Inspector
npm run dev

# Or, start the server directly
node dist/index.js --stdio
```

### Connecting with an MCP-compatible AI Assistant

Configure your AI assistant (like Cursor, VS Code Copilot Chat, etc.) to connect to the MCP server. Use the full path to the built server script:

```json
// Example configuration (e.g., in VS Code settings.json for Copilot Chat)
"github.copilot.advanced": {
    "touchdesigner": {
        "command": "node",
        "args": [
            "/full/path/to/touchdesigner-mcp/dist/index.js", // <-- Replace with actual full path
            "--stdio"
        ],
        "transportType": "stdio"
    }
}
```

Replace `/full/path/to/touchdesigner-mcp/dist/index.js` with the actual absolute path on your system. Once configured and the server is running, the assistant can use the provided TouchDesigner tools.

## Project Structure

```
├── src/                     # Node.js MCP Server Source Code
│   ├── api/                 # OpenAPI specification (index.yml) and components
│   ├── core/                # Core utilities (logger, error handling)
│   ├── features/            # MCP features implementation
│   │   ├── prompts/         # Prompt handlers
│   │   ├── resources/       # Resource handlers
│   │   └── tools/           # Tool handlers (e.g., tdTools.ts)
│   ├── server/              # MCP Server logic (connection, main server class)
│   ├── tdClient/            # Generated TypeScript client for TD Python API
│   ├── index.ts             # Main entry point for the Node.js server
│   └── ...
├── td/                      # TouchDesigner specific files
│   ├── modules/             # Python modules for TouchDesigner
│   │   ├── mcp/             # Core Python logic for handling MCP requests in TD
│   │   │   ├── controllers/ # Request handlers (api_controller.py, generated_handlers.py)
│   │   │   └── services/    # Business logic (api_service.py)
│   │   ├── td_server/       # Generated Python Flask server code (via openapi-generator)
│   │   └── utils/           # Shared Python utilities
│   ├── templates/           # Mustache templates for Python code generation
│   ├── genHandlers.js       # Node.js script to generate Python handlers
│   ├── import_modules.py    # Helper script for Python imports in TD
│   └── mcp_webserver_base.tox # Main TouchDesigner component
├── tests/                   # Automated tests
│   ├── integration/
│   └── unit/
├── public/                  # Files for mock service worker (if used)
├── .env                     # Local environment variables (gitignored)
├── dotenv                   # Template for .env
├── biome.json               # Biome formatter/linter config
├── package.json             # Node.js project manifest
├── tsconfig.json            # TypeScript configuration
├── orval.config.ts          # Orval configuration (TS client generation)
├── README.md                # This file
└── README.ja.md             # Japanese README
```

## MCP Server Capabilities

This server exposes TouchDesigner functionality through the Model Context Protocol (MCP), including Tools, Prompts, and Resources.

### Tools

Tools allow the AI assistant to perform actions in TouchDesigner.

| Tool Name                   | Description                                          | Key Parameters                                  |
| :-------------------------- | :--------------------------------------------------- | :---------------------------------------------- |
| `create_td_node`            | Create a new node.                                   | `parentPath`, `nodeType`, `nodeName` (opt.)     |
| `delete_td_node`            | Delete an existing node.                             | `nodePath`                                      |
| `get_td_nodes`              | Get nodes within a parent path, optionally filtered. | `parentPath`, `pattern` (opt.)                  |
| `get_td_node_parameters`    | Get parameters of a specific node.                   | `nodePath`                                      |
| `update_td_node_parameters` | Update parameters of a specific node.                | `nodePath`, `properties` (object)               |
| `EXECUTE_NODE_METHOD`| Call a Python method on a node.                      | `nodePath`, `method`, `args` (opt.), `kwargs` (opt.) |
| `get_td_classes`            | Get a list of available TouchDesigner Python classes. | *(None)*                                        |
| `get_td_class_details`      | Get detailed info about a TD Python class/module.    | `className`                                     |
| `get_td_info`           | Get information about the TD server environment.     | *(None)*                                        |
| `execute_python_script`     | Execute an arbitrary Python script in TD.            | `script`                                        |

*(Refer to the MCP server connection details in your AI assistant for the exact input schemas.)*

### Prompts

*(Currently, no specific prompts are registered in the provided server definition. This section can be updated if prompts are added.)*

### Resources

Resources provide contextual information to the AI assistant.

| Resource URI                                                     | Description                                                                 | Access                                     |
| :--------------------------------------------------------------- | :-------------------------------------------------------------------------- | :----------------------------------------- |
| `tdmcp:///td_python_class_reference_index`                       | Index of TouchDesigner Python classes and modules.                          | Direct Access                              |
| `tdmcp:///td_python_class_reference_docs`                        | Documentation for specific TD Python classes.                               | Template: `?class=ClassName1,ClassName2` |
| `tdmcp:///td_python_class_reference_docs?class={ClassNameList}` | Template URI to fetch documentation for specific classes (e.g., `TextTOP`). | Template Access                            |

### Current Limitations

- **Web Interface:** No web UI is provided; interaction is via MCP tools/resources.
- **Error Handling:** Error reporting from TouchDesigner back to the AI might be basic.
- **Complex Operations:** Very complex multi-step operations might require careful prompting or breaking down into smaller tool calls.
- **Real-time Sync:** The state known by the AI might not always be perfectly synchronized with the real-time state of the TouchDesigner project if changes are made manually in TD.

*(This list may not be exhaustive and depends on the specific implementation details within the Python handlers.)*

## Development

### Development Setup

```bash
# Install dependencies
npm install

# Run linters and type checker
npm run lint

# Run tests
npm test

# Start the server with MCP Inspector for debugging
npm run dev
```

### Code Generation Workflow

The project uses OpenAPI and code generation tools extensively:

1.  **API Definition:** The API contract between the Node.js MCP server and the Python server running in TouchDesigner is defined in `src/api/index.yml` using the OpenAPI 3.0 standard.
2.  **TypeScript Client Generation (`npm run gen:mcp`):**
    *   Uses `orval` (configured via `orval.config.ts`).
    *   Reads `src/api/index.yml`.
    *   Generates a typed TypeScript client (`src/tdClient/`) that the Node.js server uses to make requests to the Python server in TouchDesigner. Includes Zod schemas for request/response validation.
3.  **Python Server Generation (`npm run gen:webserver`):**
    *   Uses `openapi-generator-cli` via Docker.
    *   Reads `src/api/index.yml`.
    *   Generates a Python Flask server skeleton (`td/modules/td_server/`) based on the API definition. This code runs inside TouchDesigner via a Web Server DAT.
    *   **Requires Docker to be installed and running.**
4.  **Python Handler Generation (`npm run gen:handlers`):**
    *   Uses a custom Node.js script (`td/genHandlers.js`) and Mustache templates (`td/templates/`).
    *   Reads the generated Python server code or the OpenAPI spec.
    *   Generates Python handler implementations (`td/modules/mcp/controllers/generated_handlers.py`) that connect the generated Flask routes to the actual TouchDesigner control logic found in `td/modules/mcp/services/api_service.py`.

The complete build process (`npm run build`) executes all necessary generation steps (`npm run gen`) followed by TypeScript compilation (`tsc`).

## Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests and Run to ensure everything works (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## License

MIT

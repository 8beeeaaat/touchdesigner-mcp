# TouchDesigner MCP

This is an implementation of an MCP (Model Context Protocol) server for TouchDesigner. The goal is to enable AI agents to control and operate TouchDesigner projects.

## Overview

![demo](https://github.com/user-attachments/assets/b7130ebe-406c-4e05-9efc-5d493eb800cb)

TouchDesigner MCP acts as a bridge between AI models and the TouchDesigner WebServer DAT, enabling AI agents to:
- Create, modify, and delete nodes
- Query node properties and project structure
- Programmatically control TouchDesigner via Python scripts

## Usage

*Requires Node.js to be installed*

### 1. Install the touchdesigner-mcp-server package

`npm install touchdesigner-mcp-server`

### 2. Connect to TouchDesigner

#### Place mcp_webserver_base.tox in TouchDesigner

Start TouchDesigner and import the `td/mcp_webserver_base.tox` component directly under your TouchDesigner project.
Example: Place it as `/project1/mcp_webserver_base`

Importing the tox will trigger the `td/import_modules.py` script, which loads modules such as API server controllers.

#### Verify API server operation
Run `npm run test` to execute unit tests for the MCP server code and connection tests to TouchDesigner.
This test ensures that the Python modules in the `td/modules` directory are accessible from the `mcp_webserver_base` component.
You can check communication logs by opening the Textport from the TouchDesigner menu.

### 3. Configure the TouchDesigner MCP Server
With TouchDesigner running, configure your AI agent (Claude Desktop, Cursor, VSCode CopilotChat, etc.) to connect to the MCP server.

*Example: Claude Desktop*
```json
{
  "mcpServers": {
    "touchdesigner": {
      "args": [
        "/path/to/your/touchdesigner-mcp-server/dist/index.js", // <-- Replace with the absolute path to touchdesigner-mcp-server/dist/index.js
        "--stdio"
      ],
      "command": "node",
      "transportType": "stdio"
    }
  }
}
```

If the MCP server is recognized, setup is complete.
If you see an error at startup, try launching the agent again after starting TouchDesigner.
If the API server is running in TouchDesigner, the agent can use TouchDesigner via the provided tools.


## MCP Server Features

This server enables operations on TouchDesigner via the Model Context Protocol (MCP) and provides references to various implementation documents.

### Tools

Tools allow AI agents to perform actions in TouchDesigner.

| Tool Name                | Description                                                        |
| :---------------------- | :----------------------------------------------------------------- |
| `create_td_node`        | Create a new node.                                                 |
| `delete_td_node`        | Delete an existing node.                                           |
| `exec_node_method`      | Call a Python method on a node.                                    |
| `execute_python_script` | Execute an arbitrary Python script in TD.                          |
| `get_td_class_details`  | Get details of a TD Python class/module.                           |
| `get_td_classes`        | Get a list of TouchDesigner Python classes.                        |
| `get_td_info`           | Get information about the TD server environment.                   |
| `get_td_node_parameters`| Get parameters of a specific node.                                 |
| `get_td_nodes`          | Get nodes under a parent path (optionally filtered).               |
| `update_td_node_parameters` | Update parameters of a specific node.                        |

### Prompts

Prompts provide instructions for AI agents to perform specific actions in TouchDesigner.

| Prompt Name         | Description                                                                 |
| :------------------| :-------------------------------------------------------------------------- |
| `Search node`      | Fuzzy search for nodes and retrieve information based on name, family, type. |
| `Node connection`  | Provide instructions to connect nodes within TouchDesigner.                 |
| `Check node errors`| Check errors for a specified node, recursively for child nodes if any.      |

### Resources

Not implemented


## For Developers

### Building the MCP Server Code

1. Clone the repository
```bash
git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
```

2. Install dependencies
```bash
cd touchdesigner-mcp
npm install
```
3. Set up environment file and build
```
# Copy the template and adjust TD_WEB_SERVER_URL as needed
cp dotenv .env

# Build the project (generates API client/server schemas and compiles MCP resources)
# Make sure the Docker daemon is running before executing this command
npm run build
```

### TouchDesigner Setup

#### 1. **Code Generation:**
Run `npm run build` to generate the following code:
- MCP server code
- API server code for TouchDesigner WebServer DAT

#### 2. **Import the WebServer for MCP server into TouchDesigner:**
Start TouchDesigner and import the `td/mcp_webserver_base.tox` component directly under your project.
Importing the tox will trigger the `td/import_modules.py` script, which loads modules such as API server controllers.

#### 3. **Verify API server operation:**
Ensure that the Python modules in the `td/modules` directory are accessible from the `mcp_webserver_base` component.
Run `npm run test` to execute unit and integration tests for the MCP server code and TouchDesigner connection.
You can check communication logs by opening the Textport from the TouchDesigner menu.

You can debug with @modelcontextprotocol/inspector using `npm run dev`.

*TIPS*
`mcp_webserver_base.tox` includes a WebServer DAT configured to link the MCP server and TouchDesigner.
Ensure this DAT is active and running on the port specified by `TD_WEB_SERVER_URL` in your `.env` file (default: `9981`).
To change the port:
1. Change `TD_WEB_SERVER_PORT` in `.env`
2. Re-run `npm run build`
3. Change the port in mcp_webserver_base (WebServer DAT) and restart the DAT

### Connecting with MCP-compatible AI Agents

With TouchDesigner running, configure your AI agent (Cursor, Claude Desktop, VSCode CopilotChat, etc.) to connect to the MCP server.

#### Example: Claude Desktop
```json
{
  "mcpServers": {
    "dev_touchdesigner": {
      "args": [
        "/path/to/your/touchdesigner-mcp/dist/index.js", // <-- Replace with the absolute path to /dist/index.js after build
        "--stdio"
      ],
      "command": "node",
      "transportType": "stdio"
    }
  }
}
```

### Project Structure After Setup

```
├── src/                       # MCP server source code
│   ├── api/                  # OpenAPI spec for TD WebServer
│   ├── core/                 # Core utilities (logger, error handling)
│   ├── features/             # MCP feature implementations
│   │   ├── prompts/         # Prompt handlers
│   │   ├── resources/       # Resource handlers
│   │   └── tools/           # Tool handlers (e.g., tdTools.ts)
│   ├── gen/                  # Code generated from OpenAPI schema for MCP server
│   ├── server/               # MCP server logic (connections, main server class)
│   ├── tdClient/             # TD connection API client
│   ├── index.ts              # Main entry point for Node.js server
│   └── ...
├── td/                        # TouchDesigner related files
│   ├── modules/              # Python modules for TouchDesigner
│   │   ├── mcp/              # Core logic for handling MCP requests in TD
│   │   │   ├── controllers/ # API request controllers (api_controller.py, generated_handlers.py)
│   │   │   └── services/    # Business logic (api_service.py)
│   │   ├── td_server/        # Python model code generated from OpenAPI schema
│   │   └── utils/            # Shared Python utilities
│   ├── templates/             # Mustache templates for Python code generation
│   ├── genHandlers.js         # Node.js script for generating generated_handlers.py
│   ├── import_modules.py      # Helper script to import API server modules into TD
│   └── mcp_webserver_base.tox # Main TouchDesigner component
├── tests/                      # Test code
│   ├── integration/
│   └── unit/
├── .env                        # Local environment variables (git ignored)
├── dotenv                      # Template for .env
└── orval.config.ts             # Orval config (TS client generation)
```


### API Code Generation Workflow

This project uses OpenAPI-based code generation tools (Orval / openapi-generator-cli):

**API Definition:** The API contract between the Node.js MCP server and the Python server running inside TouchDesigner is defined in `src/api/index.yml`.

1.  **Python server generation (`npm run gen:webserver`):**
    *   Uses `openapi-generator-cli` via Docker.
    *   Reads `src/api/index.yml`.
    *   Generates a Python server skeleton (`td/modules/td_server/`) based on the API definition. This code runs inside TouchDesigner via WebServer DAT.
    *   **Requires Docker to be installed and running.**
2.  **Python handler generation (`npm run gen:handlers`):**
    *   Uses a custom Node.js script (`td/genHandlers.js`) and Mustache templates (`td/templates/`).
    *   Reads the generated Python server code or OpenAPI spec.
    *   Generates handler implementations (`td/modules/mcp/controllers/generated_handlers.py`) that connect to business logic in `td/modules/mcp/services/api_service.py`.
3.  **TypeScript client generation (`npm run gen:mcp`):**
    *   Uses `Orval` to generate API client code and Zod schemas for tool validation from the schema YAML bundled by `openapi-generator-cli`.
    *   Generates a typed TypeScript client (`src/tdClient/`) used by the Node.js server to make requests to the WebServer DAT.

The build process (`npm run build`) runs all necessary generation steps (`npm run gen`), followed by TypeScript compilation (`tsc`).

## Contributing

We welcome your contributions!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests and ensure everything works (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a pull request

Please always include appropriate tests when making implementation changes.

## License

MIT

# TouchDesigner MCP

This is an implementation of an MCP (Model Context Protocol) server for TouchDesigner. The goal is to enable AI agents to control and operate TouchDesigner projects.

[English](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/README.md) / [日本語](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/README.ja.md)

## Overview

[![demo clip](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/particle_on_youtube.png)](https://youtu.be/V2znaqGU7f4?si=6HDFbcBHCFPdttkM&t=635)

TouchDesigner MCP acts as a bridge between AI models and the TouchDesigner WebServer DAT, enabling AI agents to:
- Create, modify, and delete nodes
- Query node properties and project structure
- Programmatically control TouchDesigner via Python scripts

## Usage

*Requires Docker or Node.js to be installed*

<details>
  <summary>Method 1: Using Docker Image (Recommended)</summary>

  [![tutorial](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/tutorial_docker.png)](https://www.youtube.com/watch?v=BRWoIEVb0TU)

  #### 1. Clone the repository:
  ```bash
  git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
  cd touchdesigner-mcp
  ```

  #### 2. Set up the environment file and build:
  Copy the template file and adjust the TD_WEB_SERVER_HOST and TD_WEB_SERVER_PORT as needed before building the Docker image.

  ```bash
  cp dotenv .env
  make build
  ```

  #### 3. Install the API Server in Your TouchDesigner Project:

  Start TouchDesigner and import the `td/mcp_webserver_base.tox` component directly under the TouchDesigner project you want to control.
  Example: Place it as `/project1/mcp_webserver_base`

  Importing the tox will trigger the `td/import_modules.py` script, which loads modules such as API server controllers.

  ![import](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/import.png)

  You can check boot logs by opening the Textport from the TouchDesigner menu.

  ![import](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/textport.png)

  #### 4. Start the MCP server container

  ```bash
  docker-compose up -d
  ```

  #### 5. Configure your AI agent to use the Docker container:

  *Example for Claude Desktop*
  ```json
  {
    "mcpServers": {
      "touchdesigner": {
        "command": "docker",
        "args": [
          "compose",
          "-f",
          "/path/to/your/touchdesigner-mcp/docker-compose.yml",
          "exec",
          "-i",
          "touchdesigner-mcp-server",
          "node",
          "dist/index.js",
          "--stdio"
        ]
      }
    }
  }
  ```

  *On Windows systems, include the drive letter like C: e.g. `C:\\path\\to\\your\\touchdesigner-mcp\\docker-compose.yml`*
</details>

<details>
  <summary>Method 2: Using the NPM Package</summary>

  To use the pre-built JS directly from Node.js:

  [![tutorial](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/tutorial.png)](https://www.youtube.com/watch?v=jFaUP1fYum0)

  #### 1. Install the package
  ```bash
  mkdir some && cd ./some  # If you need a new directory
  npm install touchdesigner-mcp-server
  ```

  #### 2. Install the API Server in Your TouchDesigner Project:

  Start TouchDesigner and import the `some/node_modules/touchdesigner-mcp-server/td/mcp_webserver_base.tox` component directly under the TouchDesigner project you want to control.
  Example: Place it as `/project1/mcp_webserver_base`

  Importing the tox will trigger the `some/node_modules/touchdesigner-mcp-server/td/import_modules.py` script, which loads modules such as API server controllers.

  ![import](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/import.png)

  You can check boot logs by opening the Textport from the TouchDesigner menu.

  ![import](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/textport.png)

  #### 3. Configure your AI agent:

  *Example for Claude Desktop*
  ```json
  {
    "mcpServers": {
      "touchdesigner": {
        "args": [
          "/path/to/your/node_modules/touchdesigner-mcp-server/dist/index.js", // <-- Replace with the absolute path to node_modules/touchdesigner-mcp-server/dist/index.js
          "--stdio"
        ],
        "command": "node"
      }
    }
  }
  ```

  *On Windows systems, include the drive letter like C: e.g. `C:\\path\\to\\your\\node_modules\\touchdesigner-mcp-server\\dist\\index.js`*
</details>

### 3. Verify Connection

If the MCP server is recognized, setup is complete.
If it's not recognized, try restarting your AI agent.
If you see an error at startup, try launching the agent again after starting TouchDesigner first.
When the API server is running properly in TouchDesigner, the agent can use the provided tools to operate TouchDesigner.

![demo](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/nodes_list.png)


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

### Building Client and API Server Code

1. `cp dotenv .env`
2. Adjust `TD_WEB_SERVER_HOST` and `TD_WEB_SERVER_PORT` in the `.env` file to match your  development environment
3. Run `make build` or `npm run build` to regenerate the code

When you need to reflect the built code, please restart both the MCP server and TouchDesigner.

### Verifying the API Server
- `npm run test`
Run unit tests for the MCP server code and integration tests with TouchDesigner.
You can check communication logs by opening the Textport from the TouchDesigner menu.

- `npm run dev`
Launch @modelcontextprotocol/inspector to debug various features.

### Project Structure Overview

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

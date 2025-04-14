# TouchDesigner MCP

An evolving Model Context Protocol (MCP) server implementation for TouchDesigner, aiming to enable AI assistants to control and interact with TouchDesigner projects.

## Overview

TouchDesigner MCP is a bridge between AI models and TouchDesigner, allowing AI assistants to:
- Create, modify, and delete nodes in TouchDesigner projects
- Query node properties and project structure
- Control TouchDesigner operations programmatically through a standardized protocol

This implementation aims to follow the Model Context Protocol standard, working towards providing a seamless integration between AI models and TouchDesigner's powerful real-time visual development environment.

## Prerequisites

- Node.js
- TouchDesigner (latest stable version recommended)

## Installation

```bash
# Clone the repository
git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
cd touchdesigner-mcp

# Install dependencies
npm install

# Set up environment configuration
cp dotenv .env

# Build the project
npm run build
```

## Usage

### Setting Up TouchDesigner

1. Open TouchDesigner
2. Import the provided `td/mcp_webserver_base.tox` component
3. Ensure the TouchDesigner web server is running (this component handles the communication between the MCP server and TouchDesigner)

> Note: By default, the MCP server connects to TouchDesigner at `http://localhost:9080`. If you need to change this connection address, modify the `TD_WEB_SERVER_URL` value in the `.env` file, then rebuild the project with `npm run build`.

### Starting the MCP Server

```bash
# Start the server in CLI mode
npm run dev
```

### Connecting with an MCP-compatible AI Assistant
Like Claude Desktop, Cursor, GitHub Copilot ...etc.

```json
    "servers": {
      "TouchDesigner": {
        "command": "node",
        "args": [
          "/Users/[user_name]/.../touchdesigner-mcp/dist/index.js", // full path
          "--stdio"
        ],
        "transportType": "stdio",
      }
    }
```

Once the server is running, you can connect any MCP-compatible AI assistant to interact with your TouchDesigner project.

## Project Structure

```
├── src/               # Source code
│   ├── api/           # API specifications and client configuration
│   ├── gen/           # Generated API models and endpoints
│   ├── schemas/       # Node schema definitions
│   ├── tdClient/      # TouchDesigner client implementation
│   └── ...
├── td/                # TouchDesigner components
│   └── mcp_webserver_base.tox  # Web server component for TouchDesigner
└── ...
```

## MCP Server Capabilities

### Current Features

#### Tools
- **create_td_node**: Create a new TOP node in TouchDesigner (currently only TOP family is supported)
- **delete_td_node**: Delete a node at the specified path
- **get_td_server_info**: Get TouchDesigner server information
- **get_td_project_nodes**: Get all nodes in the current project
- **get_td_default_node_parameters**: Get default parameters for a specific node type
- **get_td_node_property**: Get properties of a specific node
- **update_td_node_properties**: Update node parameters, including node connections

#### Prompts
- **check-node**: Prompt for checking information about a specific node
  - Usage example: Provide `nodeName`, `nodeFamily`, and `nodeType` information to get descriptions and usage guidance for that node

#### Resources
- **node_schemas** (`tdmcp:///node_schemas`): Provides schema definitions for TouchDesigner nodes
  - Information about available node types and their parameters
  - Referenced by AI assistants when generating node operation commands
  - Defined with Zod schemas to support type-safe operations

### Current Limitations

- Web interface is not yet available - currently only supports CLI mode
- Limited to operations exposed through the TouchDesigner Web API
- Currently only supports creating TOP nodes, other families (COMP, CHOP, SOP, DAT, MAT) are not yet supported
- The validateToolParams method will throw errors for unsupported node families or types
- Does not support direct DAT editing functionality
- Limited support for complex parameter types
- No support for custom components development

## MCP Protocol Implementation Details

TouchDesigner MCP implements the three key elements of the Model Context Protocol (MCP):

### 1. Tools
The MCP server provides seven tools that enable AI to directly manipulate TouchDesigner:

| Tool Name | Description | Parameters |
|---------|------|-----------|
| create_td_node | Create TOP nodes | nodeFamily, nodeType, nodeName (optional), parameters (optional), connection (optional) |
| delete_td_node | Delete nodes | nodePath |
| get_td_server_info | Get server information | None |
| get_td_project_nodes | Get all nodes in the project | None |
| get_td_default_node_parameters | Get default parameters for a node type | nodeFamily, nodeType |
| get_td_node_property | Get properties of a specific node | nodePath |
| update_td_node_properties | Update node properties | nodePath, parameters (optional), connection (optional) |

### 2. Prompts
Providing reusable prompt templates:

| Prompt Name | Description | Arguments |
|------------|------|-----|
| check-node | Guidance on node usage | nodeName, nodeFamily, nodeType |

### 3. Resources
Data and content that AI can reference:

| Resource URI | Description | MIME Type |
|------------|------|-----------|
| tdmcp:///node_schemas | TouchDesigner node schema definitions | application/json |

## Development

### Development Setup

```bash
# Run in inspector
npm run dev
```

## APIs For TD WebServer

- The APIs for communicating with TouchDesigner WebServer are defined using OpenAPI schema in `src/api/index.yml`
- Client code and Zod schemas are automatically generated using `npm run gen` command
- Currently exploring options to also generate Python client code for the TouchDesigner side - contributors with experience in Python OpenAPI code generation are welcome!

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

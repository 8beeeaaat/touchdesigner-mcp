# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TouchDesigner MCP is a Model Context Protocol server that bridges AI agents with TouchDesigner, enabling programmatic control of TouchDesigner projects through a WebServer DAT API. The project uses TypeScript/Node.js for the MCP server and Python for TouchDesigner integration.

## Development Commands

### Build & Compilation
```bash
npm run build              # Full build (generation + compilation)
npm run build:gen          # Generate all code from OpenAPI specs
npm run build:dist         # Compile TypeScript to dist/
```

### Code Generation Pipeline
```bash
npm run gen                # Run all generation steps
npm run gen:webserver      # Generate Python server from OpenAPI (requires Docker)
npm run gen:handlers       # Generate Python handlers from templates
npm run gen:mcp           # Generate TypeScript client with Zod schemas
```

### Testing
```bash
npm run test              # Run all tests (unit + integration)
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only (requires TouchDesigner)
npm run coverage          # Test coverage report
```

### Code Quality
```bash
npm run lint              # Run all linters (Biome + TypeScript)
npm run lint:biome        # Biome linting
npm run lint:tsc          # TypeScript type checking
npm run format            # Auto-fix formatting issues
```

### Development
```bash
npm run dev               # Launch MCP inspector for debugging
make build                # Docker build and module extraction
docker-compose up -d      # Start containerized server
```

## Architecture Overview

### Core Components
- **MCP Server** (`src/`): Node.js/TypeScript MCP server implementation
- **TouchDesigner Integration** (`td/`): Python modules and TouchDesigner component
- **API Contract** (`src/api/index.yml`): OpenAPI specification defining the bridge

### Code Generation Workflow
1. **API Definition**: `src/api/index.yml` defines the contract between Node.js and Python
2. **Python Server**: Generated via `openapi-generator-cli` into `td/modules/td_server/`
3. **Python Handlers**: Custom generation using Mustache templates into `td/modules/mcp/controllers/`
4. **TypeScript Client**: Generated via Orval with Zod schemas into `src/gen/`

### Key Directories
- `src/features/tools/` - MCP tool implementations (10 tools for TD operations)
- `src/features/prompts/` - MCP prompt handlers (3 prompts for AI instructions)
- `td/modules/mcp/` - Python MCP request handlers for TouchDesigner
- `td/mcp_webserver_base.tox` - TouchDesigner component (must be imported into TD projects)

## Testing Requirements

Integration tests require TouchDesigner to be running with the `mcp_webserver_base.tox` component imported. The WebServer must be accessible at the configured host/port (default: localhost:9981).

## Environment Configuration

Copy `dotenv` to `.env` and configure:
- `TD_WEB_SERVER_HOST` - TouchDesigner WebServer host
- `TD_WEB_SERVER_PORT` - TouchDesigner WebServer port

## Development Notes

- Docker is required for Python server generation (`gen:webserver`)
- Always run the full build after API changes to regenerate all dependent code
- TouchDesigner component must be restarted after rebuilding Python modules
- The project follows a strict OpenAPI-driven development approach where the YAML specification is the source of truth
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent ops (multi-instance) — read first when driving TD

Contract: **[docs/AGENT_MCP.md](docs/AGENT_MCP.md)**. Offline ToeDigest: **[docs/toe-digest.md](docs/toe-digest.md)**.

- Sticky **`lab`** `:9981`; owned `:9984+`; skip Stagepad/4designer ports **9982**/**9983**
- No per-call target — wrong sticky ⇒ wrong project
- `npm run build` then restart MCP after `src/` / schema changes (stdio loads `dist/`)
- Live verify: `get_td_node_errors` + `get_top_image` (black frame = fail)
- Textport / computer-use self-debug skill ≠ lifecycle tools — see `.claude/skills/touchdesigner-self-debug/` vs `create_td_project` / `start_td_project`

## Development Commands

### Building and Development
- `npm run build` - Full build process including code generation and TypeScript compilation (recommended for development)
- `npm run dev` - Start MCP inspector for debugging (`@modelcontextprotocol/inspector`)
- `make build` - Docker-based build that copies both `dist/` and `td/modules/` from container (for CI/CD)
- `npm run build:mcpb` - Build MCP Bundle package for distribution
- `make clean` - Remove all generated files (`dist`, `td/modules`, `node_modules`)

### Code Generation Workflow
The project uses OpenAPI 3.0.0 schema-based code generation with a three-step process:

- `npm run gen:openapi` - Bundle OpenAPI schema files into single YAML using `@redocly/cli`
- `npm run gen:handlers` - Generate Python handlers using custom Node.js script with Mustache templates
- `npm run gen:mcp` - Generate TypeScript client code and Zod schemas using Orval v8
- `npm run gen` - Run all generation steps in sequence

### Testing and Quality
- `npm test` - Run all tests (integration and unit)
- `npm run test:integration` - Integration tests with TouchDesigner WebServer
- `npm run test:unit` - Unit tests for MCP server components
- `npm run coverage` - Generate test coverage report

### HTTP Transport Mode
- `npm run http` - Build and start the MCP server in HTTP mode (port 6280, TD on 9981)
- `npm run test:integration` - Includes the HTTP transport suite (`tests/integration/httpTransport.test.ts`)

**HTTP Mode Configuration:**
- Default port: `3000`
- Default host: `127.0.0.1`
- Endpoint: `/mcp`
- Health check: `GET /health`

### Linting and Formatting

The project uses multiple formatters and linters for different languages:

**All languages:**

- `npm run lint` - Run all linters (Biome, TypeScript, Ruff, Prettier)
- `npm run format` - Auto-fix formatting for all languages

**TypeScript/JavaScript (Biome):**

- `npm run lint:biome` - Lint TypeScript/JavaScript files
- `npm run format:biome` - Format and fix TypeScript/JavaScript files
- Sorts imports and object keys automatically via Biome Assist

**Python (Ruff):**

- `npm run lint:python` - Lint Python files in `td/` directory
- `npm run format:python` - Format and fix Python files (includes import sorting)
- Configuration in `pyproject.toml`
- Note: Only `td/modules/td_server/openapi_server/openapi/openapi.yaml` is auto-generated

**YAML (Prettier):**

- `npm run lint:yaml` - Check YAML file formatting
- `npm run format:yaml` - Format YAML files (uses Prettier)
- Configuration in `.prettierrc.json`

**Important:**

- Python (Ruff) must be installed separately via pip/pipx/uv for formatting to work

## Architecture Overview

### Dual-Process Architecture
This MCP server operates as a bridge between AI agents and TouchDesigner through a dual-process architecture:

1. **Node.js MCP Server** (`src/`) - Implements MCP protocol, handles AI agent communication
2. **Python WebServer** (`td/modules/`) - Runs inside TouchDesigner via WebServer DAT, controls TD directly

Communication flows: AI Agent ↔ Node.js MCP Server ↔ HTTP API ↔ Python WebServer (in TouchDesigner)

### Key Components

#### MCP Server (Node.js)
- `TouchDesignerServer` class in `src/server/touchDesignerServer.ts` - Main MCP server implementation
- `TouchDesignerClient` in `src/tdClient/` - HTTP client for communicating with TD WebServer
- Tool definitions in `src/features/tools/toolDefinitions.ts` - `TOOL_DEFINITIONS` is the single source of truth for each MCP tool (name, description, input schema, handler). `handlers/tdTools.ts` registers them in a loop, and the `describe_td_tools` manifest derives its parameter metadata from each tool's Zod schema via introspection
- Code generation outputs in `src/gen/` - Auto-generated API client and Zod schemas

#### TouchDesigner Integration (Python)
- `mcp_webserver_base.tox` - Main TouchDesigner component to import
- `api_controller.py` - Routes HTTP requests using OpenAPI schema
- `api_service.py` - Business logic for TouchDesigner operations
- `generated_handlers.py` - Auto-generated handler stubs (connects controller to service)

### Transport Architecture

The transport layer uses a factory + manager pattern to support stdio and streamable HTTP modes:

- `src/transport/factory.ts` – Validates transport config (stdio vs HTTP) and instantiates the appropriate MCP transport
- `src/transport/expressHttpManager.ts` – Wraps `StreamableHTTPServerTransport` inside an Express server, wiring `/mcp` and `/health`, plus graceful shutdown
- `src/transport/sessionManager.ts` – Tracks HTTP sessions (UUIDs, TTL cleanup) for health metrics and future SDK callbacks
- `src/transport/config.ts` – Type definitions and Zod validators for `TransportConfig`

Design references: `.doc/streamable-http-implementation-plan.md` and `.doc/refactor_sdk_first.md` cover the SDK-first approach and HTTP rollout plan.

### Code Generation System
The project uses OpenAPI 3.0.0 schema (`src/api/index.yml`) for maintaining consistency:

- OpenAPI schema bundled via `@redocly/cli` to `td/modules/td_server/openapi_server/openapi/openapi.yaml`
- TypeScript API client and Zod schemas generated via Orval v8
- Python handler stubs generated using Mustache templates
- All generation must run after schema changes

### Environment Configuration
- Server accepts `--host` and `--port` CLI arguments instead of using .env files
- Default TouchDesigner WebServer runs on `localhost:9981`
- CLI arguments: `--host=http://localhost --port=9981`
- Environment variables are set programmatically from CLI arguments at runtime

## Development Workflow

1. **Setting up TouchDesigner**: Import `td/mcp_webserver_base.tox` into your TD project
2. **Code changes**: Modify source files in `src/` or TouchDesigner modules in `td/modules/`
3. **API changes**: Update `src/api/index.yml` then run `npm run gen` to regenerate all code
4. **Building**: Run `npm run build` for full build or `make build` for Docker-based build
5. **Testing**: Always run `npm test` before committing changes

## TouchDesigner-Specific Patterns

### Node Operations
- Node paths use TouchDesigner's `/project1/container/node` format
- Family types include `COMP`, `TOP`, `SOP`, `CHOP`, `DAT`, `MAT`
- Parameter updates use TouchDesigner's parameter system via Python API

### Python Execution
- Scripts execute in TouchDesigner's Python environment via `execute_python_script` tool
- Access to `td` module, `me`, `op()`, and all TouchDesigner Python APIs
- Results serialized as JSON for transmission back to MCP client

### Error Handling
- Uses Result pattern for error propagation between Node.js and Python layers
- TouchDesigner errors captured and formatted for MCP protocol
- Logging available in both TouchDesigner Textport and MCP client

## Current Development Tasks

**Recent Update**: Generation pipeline simplification

- Replaced `@openapitools/openapi-generator-cli` (Java-based python-flask generator) with `@redocly/cli` bundle — only the bundled `openapi.yaml` was ever consumed downstream
- `gen:webserver` script renamed to `gen:openapi`; Java runtime removed from Dockerfile
- `td/modules/td_server/` now contains only `openapi_server/openapi/openapi.yaml` (the Flask skeleton, models, and CI artifacts were dead code)
- Removed stale `src/gen/models/` (old Orval output), unused `msw` dependency, and `public/mockServiceWorker.js`
- Generated type names follow source schema names (e.g. `CreateNode200Data`, `CreateNodeBody`) instead of generator-normalized names (`CreateNode200ResponseData`, `CreateNodeRequest`)

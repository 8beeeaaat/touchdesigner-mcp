# Repository Guidelines

## Project Structure

- `src/`: MCP server core (core/, features/tools, prompts, resources, tdClient, server, api definitions, etc.)
- `td/`: TouchDesigner-side Python modules and generated artifacts (modules/mcp, modules/td_server, templates, genHandlers.js, .tox)
- `tests/`: Vitest tests (`unit/` and `integration/`)
- `docs/`: Development guide, architecture, installation procedures
- Distributions: `dist/` (build artifacts), `mcpb/` and `touchdesigner-mcp.mcpb` (MCP bundle)

## Build, Test, and Development Commands

- Install dependencies: `npm install`
- Build: `npm run build` (tsc + copy artifacts), `make build` (Docker-based)
- Development inspector: `npm run dev` (stdio)
- Start HTTP mode: `npm run http` (Prerequisites: built, TD on 9981 / HTTP on 6280)
- Test: `npm test` (all), `npm run test:unit`, `npm run test:integration`, `npm run coverage`
- Lint/Format: `npm run lint` (biome + tsc + ruff + prettier), `npm run format` (with fix)
- Synchronize versions: `npm run version` (synchronizes API/Python/MCP)
- Generate code: `npm run gen:webserver` (requires Docker), `npm run gen:handlers`, `npm run gen:mcp`
- MCP bundle: `npm run build:mcpb`

## Coding Style and Naming

- TypeScript: ESM, lint/format with `biome check`, type validation with `tsc --noEmit`. Folders are generally kebab-case, files camelCase, and types PascalCase.
- Python (TD side): `ruff format` + `ruff check`. Generated code should be handled by modifying templates, not directly edited.
- YAML/Documentation: Prettier (`**/*.{yml,yaml}`).
- Compatibility Policy: MAJOR version mismatch or below `minApiVersion` will result in an error. MINOR differences will be a warning. PATCH differences are tolerated (#144).

## Testing Guidelines

- Framework: Vitest (unit/integration). MSW mocks are available.
- For compatibility or TD client related issues, please update or add existing test cases.
- For new tests, name them in `tests/unit/*.test.ts` or `tests/integration/*.test.ts`.

## Commits and Pull Requests

- Commit example: `fix: ...`, `docs: ...`, `dev v1.4.2 (#142)`. Prefix + summary + PR number if applicable.
- For PRs, include a summary of changes, verification steps (commands executed), and related issues/links (e.g., `#144`). For UI changes or artifact differences, provide a clear overview.

## Security and Configuration Tips

- The default connection destination for TouchDesigner is `127.0.0.1:9981`. For HTTP mode, specify using `--mcp-http-port`/`--mcp-http-host`.
- If version compatibility is broken, check the README for update procedures and run `npm run version`.

# Repository Guidelines

## Agent ops (multi-instance fork)

Before driving TouchDesigner from an agent, read **[docs/AGENT_MCP.md](docs/AGENT_MCP.md)**:

- Sticky target **`lab`** @ **9981**; owned instances **≥9984**; never treat **9982**/**9983** as TD targets
- `list_td_targets` ≠ alive; `select_td_target` probes; assert `projectFolder` + `projectName` before mutate
- After MCP restart, owned targets drop from the in-memory registry until `start_td_project`
- Offline `.toe`: `get_toe_digest` / `get_toe_node` — [docs/toe-digest.md](docs/toe-digest.md)
- Source changes: `npm run build` → restart MCP (clients load `dist/cli.js`)

Cursor skill (fork-local): [`.cursor/skills/touchdesigner-mcp/SKILL.md`](.cursor/skills/touchdesigner-mcp/SKILL.md).

## Project Structure & Module Organization

`src/` contains the TypeScript MCP server: shared logic is in `core/`, MCP features in `features/`, transport code in `transport/`, and TouchDesigner communication in `tdClient/`. The OpenAPI contract starts at `src/api/index.yml`. TouchDesigner-side Python, templates, generated artifacts, and `.tox` components live in `td/`. Tests belong in `tests/unit/` or `tests/integration/`, documentation in `docs/`, and media in `assets/`. Treat `dist/`, `src/gen/`, and `td/modules/td_server/` as generated output; edit their source schemas or templates instead.

## Build, Test, and Development Commands

- `npm install` installs Node dependencies.
- `npm run build` regenerates code, compiles TypeScript, and copies runtime templates.
- `make build` performs the Docker-based TouchDesigner module build.
- `npm run dev` opens the MCP Inspector against the built stdio server.
- `npm run http` starts HTTP mode on `127.0.0.1:6280`, targeting TouchDesigner on `9981`.
- `npm test`, `npm run test:unit`, and `npm run test:integration` run all or scoped Vitest suites.
- `npm run coverage` writes V8 reports; `npm run lint` runs all static checks.
- `npm run gen` refreshes OpenAPI, Python handler, and TypeScript client output.

## Coding Style & Naming Conventions

Use ESM TypeScript, tabs, and double quotes; let Biome organize imports. Use camelCase for files and functions, PascalCase for types, and generally kebab-case for directories. Python targets 3.9; Ruff enforces tabs, double quotes, and an 88-character line length. Run `npm run format` for automatic fixes. Keep changes focused.

## Testing Guidelines

Name tests `*.test.ts` and place them in the appropriate unit or integration directory. Use Vitest globals and `vi.mock` or in-memory fakes. Add regression coverage for bug fixes, especially compatibility, transport, and TouchDesigner client changes. Run the narrow suite while developing, then `npm test` and `npm run lint` before submitting.

## Commit & Pull Request Guidelines

Use concise imperative subjects with prefixes such as `feat:`, `fix:`, `test:`, `docs:`, `chore:`, and `release:`. Add issue or PR numbers when applicable, for example `fix: include Python traceback (#184)`. Pull requests should explain the change, link issues, list verification commands, and call out generated artifacts. Include screenshots for visible output changes.

## Security & Configuration Tips

Keep local services bound to `127.0.0.1` unless remote access is intentional. Never commit credentials or machine-specific MCP configuration. After changing `package.json` versions, run `npm run version` to synchronize all metadata.

# Repository Guidelines

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

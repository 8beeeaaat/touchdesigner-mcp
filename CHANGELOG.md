# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-11-27

### ⚠️ Breaking

- Starting with v1.3.0, the MCP server actively checks the TouchDesigner Python API server’s `apiVersion` before running tools. Older components that do not report the required version trigger warnings such as `⚠️  Server API version unknown - TouchDesigner component update required`.
- To resolve any version warning:
  1. Download the latest `touchdesigner-mcp-td.zip` from [releases/latest](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest).
  2. Remove the existing `touchdesigner-mcp-td` folder and replace it with the newly extracted one.
  3. Delete any existing `mcp_webserver_base` COMP from your TouchDesigner project and import the `.tox` from the fresh folder.
  4. Restart TouchDesigner and the MCP-enabled AI agent before reconnecting.

### Added

- **Version Compatibility Guardrails**: Client now checks TouchDesigner API versions using SemVer
  - Added `compatibility.minimumServerVersion` in `package.json` as the single source of truth
  - Introduced `src/core/versionCheck.ts` with strict semver comparison and user-friendly guidance
  - New unit/integration tests ensure warnings fire only when the server is missing/older than the minimum version
- **Python Module Version Sync**: TouchDesigner side now reports the MCP API version it runs
  - Added `td/script/injectVersion.ts` to inject npm package version into `td/modules/mcp/__version__.py`
  - TouchDesigner API service returns `apiVersion`, enabling the client-side compatibility check
  - Updated build scripts (`gen:inject-version`, `gen:handlers`) to keep JS/TD components aligned
- **Module Help Tool**: New `get_module_help` tool provides Python `help()` documentation for TouchDesigner modules and classes
  - Retrieve comprehensive documentation for any TouchDesigner class (e.g., `noiseCHOP`, `textTOP`)
  - Support for multiple module name formats: `"noiseCHOP"`, `"td.noiseCHOP"`, `"tdu"`
  - Token-optimized response formatting with three detail levels (minimal, summary, detailed)
  - Helps AI agents understand TouchDesigner API usage and module capabilities without external documentation
  - Added `moduleHelpFormatter` with intelligent section extraction and preview generation
  - Comprehensive integration tests covering common use cases and error scenarios
- **Node Error Checking Tool**: New `check_node_errors` tool enables error detection in TouchDesigner nodes
  - Check for errors in specific nodes via `nodePath` parameter
  - Automatically checks all child nodes recursively using `node.errors(recurse=True)`
  - Returns a flat list of all error messages from the node and its descendants
  - Helps AI agents diagnose and troubleshoot TouchDesigner network issues
  - Added specialized formatter for error results with clear error categorization
  - **Note:** Container nodes (like baseCOMP, containerCOMP) may require `cook()` or UI interaction before dynamically created child errors are detected

### Changed

- **Code Architecture**: Simplified handler registration system by removing redundant manual overrides
  - Removed unused OpenAPI response model imports from `api_controller.py`
  - Streamlined auto-registration pattern for generated handlers
  - Maintained special handling only for operations requiring custom processing
  - Improved code maintainability and reduced complexity
- **Build Process**: Enhanced Makefile with MCPB_PATH configuration for flexible build targeting
  - Added configurable output path for MCP Bundle packages
  - Improved build process to properly copy TouchDesigner modules
- **Python Utilities**: Refined serialization, logging, and shared type definitions in TouchDesigner modules
  - `safe_serialize` now normalizes common TD-specific objects more consistently and is easier to read
  - Logging helpers gained clearer severity handling and error categorization
  - Updated Result/Log type definitions reduce duplication across controllers and services

### Fixed

- **Module Help Implementation**: Corrected Python `sys` module usage in TouchDesigner environment
  - Fixed `td.sys` reference error by using standard `sys` module
  - Changed error handling from `raise` to `return` for proper Result type handling
  - Ensures reliable help text capture across all TouchDesigner versions

### Technical

- **Test Coverage**: Added 4 new integration tests for module help functionality
  - Tests for common TouchDesigner classes, td. prefix format, utility modules, and error handling
  - Improved test coverage from 76 to 94 total tests (all passing)
  - Enhanced type safety with proper Result type narrowing in test assertions
- **API Endpoints**: Added `/api/td/modules/help` and `/api/td/nodes/check_errors` endpoints
  - Full OpenAPI schema definitions with request/response models
  - Auto-generated TypeScript client methods and Zod validation schemas
  - Comprehensive error handling with proper status codes and categories
- **Formatting & Tooling**: Added Prettier configuration/ignore files plus dedicated npm scripts for YAML formatting
  - `prettier` is now a dev dependency alongside the existing Biome workflow
  - Added `lint:python`, `lint:yaml`, and `format:*` script split along with `pyproject.toml` metadata for Python modules
  - Ensures YAML schemas and TouchDesigner Python code share automated formatting + packaging defaults

## [1.2.0] - 2025-11-18

### Changed

- **DXT to MCPB Migration**: Migrated from Desktop Extensions (DXT) to [MCP Bundles](https://github.com/modelcontextprotocol/mcpb) (MCPB)
  - Updated manifest from `dxt_version: "0.1"` to `manifest_version: "0.3"`
  - Renamed `.dxt` extension to `.mcpb`
  - Updated build scripts and workflows to use `@anthropic-ai/mcpb` CLI
  - Enhanced manifest.json with new MCPB features (repository structure)
  - Updated all documentation to reflect MCPB terminology
  - Changed build script from `build:dxt` to `build:mcpb`
  - Updated GitHub Actions workflows for MCPB package creation
  - Updated README.md and README.ja.md with new installation instructions

### Migration Notes

For users upgrading from previous versions:

- Uninstall the old `.dxt` extension from Claude Desktop
- Download and install the new `.mcpb` bundle from the latest release
- No changes required to TouchDesigner components
- All existing functionality remains unchanged

## [1.1.2] - 2025-11-16

### Fixed

- **Token-Optimized Response Formatters**: Re-introduced token-optimized response formatters after fixing critical issues ([#104 revert](https://github.com/8beeeaaat/touchdesigner-mcp/pull/104))
  - Reverted the temporary removal in v1.1.1
  - All formatter features from v1.1.0 are now fully restored and functional
  - Includes classListFormatter, nodeDetailsFormatter, nodeListFormatter, scriptResultFormatter, operationFormatter, and responseFormatter
  - Markdown templates and tool metadata system fully re-enabled

### Changed

- **Dependency Updates**: Updated and reorganized package dependencies for better compatibility
  - Updated mustache package to latest version with proper TypeScript type definitions
  - Moved `yaml` package from devDependencies to dependencies for production use
  - Ensures proper runtime availability of YAML parsing functionality

## [1.1.1] - 2025-11-16

### Changed

- **Temporary Rollback**: Temporarily reverted token-optimized response formatters to v1.0.0 baseline due to critical issues
  - Removed all formatter implementations, markdown templates, and tool metadata
  - Restored original JSON-based response format for stability
  - Note: This was a temporary measure - all features were restored in v1.1.2

## [1.1.0] - 2025-11-15

### Added

- **Token-Optimized Response Formatters**: Implemented specialized formatters to reduce token consumption in AI agent interactions
  - `classListFormatter`: Formats TouchDesigner Python class listings with configurable detail levels (minimal, summary, detailed)
  - `nodeDetailsFormatter`: Provides structured node information with parameter details
  - `nodeListFormatter`: Optimized formatting for node listings with token-efficient output
  - `scriptResultFormatter`: Enhanced script execution result formatting with better readability
  - `operationFormatter`: Standardized formatting for TouchDesigner operations
  - `responseFormatter`: Central response formatting system with markdown rendering support
- **Markdown Templates**: Added reusable Mustache templates for consistent response formatting
  - `classDetailsSummary.md`, `classListSummary.md`, `nodeDetailsSummary.md`, `nodeListSummary.md`, `scriptSummary.md`
  - Templates provide consistent structure across all tool responses
- **Tool Metadata System**: Comprehensive metadata descriptions for all TouchDesigner MCP tools
  - Detailed tool descriptions, parameter explanations, and usage examples
  - Helps AI agents understand tool capabilities and usage patterns
- **Development Scripts**: Added utility scripts for measuring formatter impact and previewing formats
  - `scripts/formatPreview.ts`: Preview formatted output before deployment
  - `scripts/measureFormatterImpact.ts`: Analyze token reduction impact (up to 70% reduction achieved)
  - `scripts/showDetailedNodes.ts`: Debug tool for inspecting node details
- **Comprehensive Testing**: Added extensive test coverage for formatter implementations
  - Unit tests for `nodeListFormatter`, `responseFormatter`, `scriptResultFormatter`
  - Integration tests for MCP tool responses to verify token optimization

### Changed

- **Tool Response Format**: All TouchDesigner tools now return optimized text responses instead of raw JSON
  - Replaced direct JSON serialization with intelligent formatters
  - Responses adapt based on `detailLevel` parameter (minimal, summary, detailed)
  - Improved readability and reduced token consumption for AI agents
- **README Documentation**: Updated with detailed information about response formatting system
  - Added "Response Formatting" section explaining detail levels and token optimization
  - Included examples of formatter usage and configuration
  - Updated both English and Japanese README files
- **Python Logging**: Enhanced logging in TouchDesigner modules with better error context
  - Improved traceback formatting for debugging
  - Added conditional traceback output based on log level

### Technical

- **Response Optimization**: Achieved up to 70% token reduction through intelligent formatting
  - Minimal mode: Returns only essential information for quick operations
  - Summary mode: Provides balanced information for most use cases
  - Detailed mode: Includes comprehensive data when needed
- **Type Safety**: Added TypeScript type definitions for formatter options and configurations
- **Code Organization**: Structured formatter code in dedicated `src/features/tools/presenter/` directory
- **Build Process**: Updated build configuration to copy markdown templates to distribution directory
- **Version Bumping**: Updated version across all components (package.json, API schema, server, DXT manifest)

### Performance

- **Token Efficiency**: Significant reduction in token usage for common operations
  - Node listings: ~70% reduction in typical cases
  - Script results: ~50-60% reduction through smart formatting
  - Class information: Configurable detail levels prevent information overload
- **Response Quality**: Maintained or improved response quality while reducing token count
  - Markdown formatting improves readability for AI agents
  - Structured output helps agents parse and understand results

## [1.0.0] - 2025-09-18

### Added

- **MCP Registry Integration**: Added support for Model Context Protocol (MCP) Registry registration
  - Added `server.json` configuration file for MCP Registry with package validation metadata
  - Added `mcpName` field to package.json for NPM package validation
  - Added stdio transport configuration for MCP client compatibility

### Technical

- **Registry Configuration**: Added MCP Registry authentication tokens to .gitignore for security
- **Packaging**: Enhanced package metadata for MCP Registry compliance and discoverability

## [0.4.7] - 2025-09-15

### Changed

- **Dependency Updates**: Updated multiple runtime and development dependencies to latest versions for improved security and performance
  - Updated @modelcontextprotocol/sdk from ^1.17.3 to ^1.18.0 for latest MCP protocol features and bug fixes
  - Updated axios from ^1.11.0 to ^1.12.2 for enhanced HTTP client functionality and security improvements
  - Updated @biomejs/biome from 2.2.0 to 2.2.4 for improved code formatting and linting capabilities
  - Updated @openapitools/openapi-generator-cli from ^2.22.0 to ^2.23.1 for better API code generation
  - Updated @types/node from ^24.3.0 to ^24.4.0 for latest Node.js type definitions
  - Updated msw (Mock Service Worker) from ^2.10.5 to ^2.11.2 for enhanced testing capabilities

### Technical

- **Dependency Management**: Added axios override to ensure version consistency across all packages
- **Security**: Updated all dependencies to address potential security vulnerabilities. <https://github.com/8beeeaaat/touchdesigner-mcp/security/dependabot/9>

## [0.4.6] - 2025-08-16

### Changed

- **Dependency Updates**: Updated multiple development and runtime dependencies to latest versions
  - Updated @modelcontextprotocol/sdk from ^1.13.2 to ^1.17.3 for latest MCP protocol features
  - Updated axios from ^1.10.0 to ^1.11.0 for improved HTTP client functionality
  - Updated zod from ^3.25.67 to 3.25.76 for enhanced schema validation
  - Updated @biomejs/biome from 2.0.6 to 2.2.0 for better code formatting and linting
  - Updated @openapitools/openapi-generator-cli from ^2.21.0 to ^2.22.0
  - Updated @types/node from ^24.0.7 to ^24.3.0 for latest Node.js type definitions
  - Updated orval from ^7.10.0 to ^7.11.2 for improved OpenAPI code generation
  - Updated typescript from ^5.8.3 to ^5.9.2 for latest language features
  - Updated vitest and other testing dependencies to latest versions

### Technical

- **Build Improvements**: Enhanced development workflow with updated tooling
- **Security**: Updated dependencies to address potential security vulnerabilities
- **Performance**: Improved build and development performance through updated tools

## [0.4.5] - 2025-07-17

### Changed

- **Version Updates**: Updated version numbers across all components to 0.4.5 ([#94](https://github.com/8beeeaaat/touchdesigner-mcp/pull/94))
  - Updated package.json from 0.4.4 to 0.4.5
  - Updated src/api/index.yml API schema version to 0.4.5
  - Updated src/server/touchDesignerServer.ts MCP server version to 0.4.5
  - Updated dxt/manifest.json DXT package version to 0.1.3
  - Updated README files to reference latest version
  - Updated GitHub Actions workflow to use touchdesigner-mcp-server@latest

### Technical

- **Package Distribution**: Enhanced package referencing to use @latest tag for improved distribution
- **Release Process**: Consolidated version bumping across all configuration files
- **Documentation**: Updated installation instructions to use latest stable version

## [0.4.4] - 2025-07-17

### Fixed

- **macOS Connection Issue**: Fixed IPv6/IPv4 mismatch causing connection failures on macOS ([#92](https://github.com/8beeeaaat/touchdesigner-mcp/pull/92))
  - Changed default host from `localhost` to `127.0.0.1` to ensure IPv4 connection
  - TouchDesigner WebServer only binds to IPv4, but `localhost` was resolving to IPv6 (`::1`) on some systems
  - Updated CLI default configuration, test files, and CI/CD pipeline
  - Resolves `connect ECONNREFUSED ::1:9981` error on macOS systems

### Changed

- **DXT Manifest Cleanup**: Removed unused `capabilities` section from DXT manifest configuration ([#93](https://github.com/8beeeaaat/touchdesigner-mcp/pull/93))
  - Streamlined DXT package configuration for better compatibility
  - Removed deprecated capabilities fields that were not utilized

## [0.4.3] - 2025-06-29

### Changed

- **DXT Package Structure**: Restructured DXT package organization ([#87](https://github.com/8beeeaaat/touchdesigner-mcp/pull/87))
  - Moved `manifest.json` to dedicated `dxt/` directory for better organization
  - Removed `.dxtignore` file as it's no longer needed with new structure
  - Updated build script to use explicit source and output paths: `npx @anthropic-ai/dxt pack dxt/ touchdesigner-mcp.dxt`
  - Simplified package scripts by removing redundant `package:dxt` script

### Technical

- Version bumped to 0.4.3 across all relevant files (package.json, src/api/index.yml, src/server/touchDesignerServer.ts)
- Improved DXT build process with cleaner directory structure and explicit path specification

## [0.4.2] - 2025-06-29

### Changed

- **DXT Package Configuration**: Enhanced .dxtignore to exclude more unnecessary files from DXT package
  - Added exclusions for `assets/`, `dist/`, `public/`, and `src/` directories
  - DXT package now only includes manifest.json for smaller, cleaner distribution
- **DXT Package Version**: Updated manifest.json version to 0.1.1 for better package tracking

### Technical

- Version bumped to 0.4.2 across all relevant files (package.json, src/api/index.yml, src/server/touchDesignerServer.ts)
- Optimized DXT package size by excluding development and build artifacts

## [0.4.1] - 2025-06-29

### Changed

- **Documentation**: Updated release links in README files to point to the latest version instead of releases index page
  - Changed links from `/releases` to `/releases/latest` for better user experience
  - Updated both English and Japanese README files
- **Development Workflow**: Minor improvements to development.yml workflow for DXT package testing

### Technical

- Version bumped to 0.4.1 across all relevant files (package.json, src/api/index.yml, src/server/touchDesignerServer.ts)
- Improved user experience by directing users to the most recent release automatically

## [0.4.0] - 2025-06-29

### Added

- **Desktop Extension (.dxt) Support**: Full Desktop Extension package support for Claude Desktop with automatic installation and configuration
- **Enhanced GitHub Actions Workflow**: Automated DXT package building and publishing in release pipeline
- **Comprehensive Unit Testing**: Added extensive test coverage for ConnectionManager and CLI functionality
- **Cross-platform Build Support**: Enhanced build system with better executable permissions handling
- **User Configuration Interface**: DXT package provides user-configurable TouchDesigner port settings

### Changed

- **BREAKING**: Recommended installation method changed from global npm install to npx for easier distribution
- **BREAKING**: Removed dotenv dependency - configuration now uses CLI arguments (`--host`, `--port`)
- **BREAKING**: Docker entry point changed from `dist/index.js` to `dist/cli.js`
- **Package Structure**: Improved separation of CLI and library usage with proper export field configuration
- **Documentation**: Completely restructured README files with visual installation guides and video demonstrations
- **Dependency Updates**: Updated all major dependencies to latest stable versions for improved security and performance

### Removed

- **Configuration Files**: Removed `.env` file and dotenv dependency in favor of CLI arguments
- **Legacy Documentation**: Removed `llms-install.md` file (superseded by improved README documentation)
- **Unused Dependencies**: Cleaned up package dependencies for leaner installation

### Fixed

- **npx Execution**: Resolved CLI entry point detection issues for better compatibility across execution environments
- **Connection Management**: Enhanced error handling and connection reliability
- **Build Process**: Fixed cross-platform executable permissions and build consistency

### Technical Improvements

- **Code Generation**: Enhanced OpenAPI-based code generation workflow
- **Testing Infrastructure**: Comprehensive unit tests with proper TypeScript types and mock handling
- **CI/CD Pipeline**: Improved release automation with prerelease detection and conditional publishing
- **Development Workflow**: Enhanced development experience with better tooling and documentation

### Migration Guide

For users upgrading from 0.3.x:

1. **Configuration**: Replace `.env` file usage with CLI arguments (e.g., `--host`, `--port`)
2. **Installation**: Switch from `npm install -g` to `npx touchdesigner-mcp-server`
3. **Docker**: Update Docker configurations to use new `dist/cli.js` entry point

## [0.4.0-alpha.6] - 2025-06-29

### Added

- **Desktop Extension (.dxt) Support**: Added full Desktop Extension (DXT) package support for Claude Desktop ([#82](https://github.com/8beeeaaat/touchdesigner-mcp/pull/82))
- New `manifest.json` file defining DXT package configuration with tools, prompts, and user configuration options
- User-configurable TouchDesigner port setting via DXT user interface
- Comprehensive tool definitions and descriptions in DXT manifest
- New `.dxtignore` file to exclude unnecessary files from DXT package

### Changed

- **GitHub Actions Workflow**: Enhanced release workflow to build and publish DXT packages automatically
  - Added DXT CLI tool installation and package building steps
  - Updated release body to include video demonstration links for setup instructions
- **README Updates**: Added visual demonstration links and improved installation instructions
  - Added GitHub user-attachments video links for TouchDesigner setup and DXT installation
  - Enhanced documentation for all installation methods (DXT, npx, Docker)
  - Updated both English and Japanese README files with video guides
- **gitignore**: Added DXT-related ignore patterns

### Documentation

- Enhanced installation documentation with visual guides and video demonstrations
- Improved DXT package distribution documentation
- Added comprehensive tool and prompt descriptions in DXT manifest

### Technical

- Version bumped to 0.4.0-alpha.6 across all relevant files
- DXT package workflow integrated into CI/CD pipeline
- Maintained backward compatibility with existing installation methods

## [0.4.0-alpha.5] - 2025-06-29

### Changed

- **BREAKING**: Removed dotenv dependency and .env file usage for configuration ([#80](https://github.com/8beeeaaat/touchdesigner-mcp/pull/80))
- **BREAKING**: Configuration now uses CLI arguments instead of environment variables
  - Use `--host` and `--port` flags to customize TouchDesigner server connection
  - Example: `npx touchdesigner-mcp-server --host 192.168.1.100 --port 8080`
- Enhanced CLI argument parsing with `parseArgs` and `isStdioMode` functions in `src/cli.ts`
- Updated error handling for server initialization with better user guidance
- Improved Docker configuration to use environment variables for build-time settings
- Enhanced Makefile to support flexible environment variable configuration

### Removed

- Removed dotenv package dependency
- Deleted `.env` configuration file
- Removed `llms-install.md` file (no longer relevant with simplified configuration)
- Cleaned up dotenv-related code from `orval.config.ts` and `src/api/customInstance.ts`

### Documentation

- Updated README.md and README.ja.md to reflect new CLI-based configuration
- Added examples for customizing server connections using command-line arguments
- Removed references to .env file configuration

### Technical

- Version bumped to 0.4.0-alpha.5 across all files
- Simplified configuration approach reduces setup complexity for users
- Maintained backward compatibility through sensible defaults

## [0.4.0-alpha.4] - 2025-06-28

### Changed

- Updated dependencies to latest versions for improved stability and security
  - Updated @modelcontextprotocol/sdk from ^1.11.1 to ^1.13.2
  - Updated axios from ^1.9.0 to ^1.10.0
  - Updated dotenv from ^16.5.0 to ^17.0.0
  - Updated zod from ^3.24.4 to ^3.25.67
  - Updated @biomejs/biome from 1.9.4 to 2.0.6
  - Updated @types/node from ^22.15.17 to ^24.0.7
  - Updated vitest from ^3.1.3 to ^3.2.4
  - Updated other development dependencies

### Technical

- Version bumped to 0.4.0-alpha.4 across all files
- Updated package-lock.json with latest dependency versions
- Maintained compatibility with existing functionality

## [0.4.0-alpha.3] - 2025-06-28

### Fixed

- Fixed MCP server startup issue with npx execution by reverting to simpler CLI entry point detection logic
- Restored v0.3.0-style `process.argv[1]` check for better compatibility with npx and various execution environments

## [0.4.0-alpha.2] - 2025-06-28

### Changed

- Updated `package.json` structure for better separation of CLI and library usage
  - Moved `main`, `types`, and `bin` fields to proper order for clarity
  - Updated `exports` field with separate entry points for library (`"."`) and CLI (`"./cli"`)
- Updated build process to use `shx chmod +x dist/*.js` for cross-platform executable permissions
- Changed development script from `dist/index.js` to `dist/cli.js` for consistency
- Modified GitHub Actions workflow to use prerelease versions with `-y` flag for auto-installation
- Updated documentation (README.md, README.ja.md) to reference prerelease versions for testing

### Technical

- Added `shx` package for cross-platform shell commands
- Version bumped to 0.4.0-alpha.2 across all files (package.json, src/api/index.yml, src/server/touchDesignerServer.ts)
- Simplified `files` field in package.json to include only necessary distribution files
- Enhanced build pipeline with executable permissions handling

## [0.4.0-alpha.1] - 2025-06-28

### Fixed

- Fixed npx execution issue where `index.js` was being called instead of `cli.js`
- Corrected `package.json` configuration to ensure proper CLI entry point resolution
- Updated `main` field to `dist/index.js` for library usage while maintaining `bin` field for CLI execution
- Enhanced `exports` field with separate paths for library (`"."`) and CLI (`"./cli"`) usage

### Technical

- Optimized package structure for both npx CLI usage and library imports
- Added comprehensive testing for npx execution flow
- Verified proper shebang handling in published packages

## [0.4.0-alpha.0] - 2025-06-28

### Added

- Prerelease/test release support in GitHub Actions workflow
- Conditional npm publishing (skips prerelease versions)
- Comprehensive unit tests for ConnectionManager
- Release process documentation in README files
- Tag-based release triggers for testing

### Changed

- **BREAKING**: Recommended usage changed from `npm install -g` to `npx touchdesigner-mcp-server` ([#69](https://github.com/8beeeaaat/touchdesigner-mcp/pull/69))
- **BREAKING**: Docker entry point changed from `dist/index.js` to `dist/cli.js`
- Updated installation instructions across all documentation (README.md, README.ja.md, llms-install.md)
- Enhanced error messages in ConnectionManager with setup instructions
- Improved GitHub Actions workflow to support both production and test releases
- Updated Japanese README to match English documentation structure

### Fixed

- ConnectionManager error handling with proper type safety
- Logger safety improvements to prevent errors when not connected
- Docker configuration to use correct entry point

### Technical

- Added comprehensive test coverage for server connection management
- Improved mock handling in unit tests with proper TypeScript types
- Enhanced CI/CD pipeline with prerelease detection
- Updated build processes to align with npx usage patterns

## [0.3.0] - 2025-06-21

### Added

- Added `CHANGELOG.md`

### Changed

- `get_td_nodes` now returns only a minimal overview of nodes by default to prevent information overload. Full properties can be included by setting the `includeProperties` parameter to `true`. ([#65](https://github.com/8beeeaaat/touchdesigner-mcp/pull/65))

## [0.2.13] - 2025-05-24

### Changed

- Version maintenance updates
- Updated API schema version references

## [0.2.12] - 2025-05-24

### Added

- Comprehensive installation guide for AI agents (`llms-install.md`) ([#63](https://github.com/8beeeaaat/touchdesigner-mcp/pull/63))
- Detailed setup instructions for Cline, Claude Desktop, Cursor, and Roo Code

### Changed

- Updated GitHub Actions workflow configuration
- Restructured README.md content

## [0.2.10] - 2025-05-XX

### Added

- Complete Docker containerization support ([#58](https://github.com/8beeeaaat/touchdesigner-mcp/pull/58))
- Dockerfile and docker-compose.yml for easy deployment
- Makefile for simplified build management
- Environment variable management via dotenv configuration
- Enhanced MCP server configuration management

### Changed

- Updated npm packages to latest versions
- Improved README documentation with Docker setup instructions
- Enhanced CI/CD workflows for Docker support

### Fixed

- Re-implemented and fixed Docker functionality (originally from 0.2.9)

## [0.2.9] - 2025-05-XX

### Added

- Initial Docker image implementation for TouchDesigner MCP Server ([#54](https://github.com/8beeeaaat/touchdesigner-mcp/pull/54))

### Note

- This version was initially reverted ([#55](https://github.com/8beeeaaat/touchdesigner-mcp/pull/55)) due to issues, then fixed and re-implemented in 0.2.10

## [0.2.8] - 2025-05-XX

### Changed

- Updated @types/node and vite packages ([#51](https://github.com/8beeeaaat/touchdesigner-mcp/pull/51))
- Dependency maintenance updates

## [0.2.7] - 2025-05-XX

### Added

- Tutorial images and text port images to README files ([#47](https://github.com/8beeeaaat/touchdesigner-mcp/pull/47))
- Visual assets: `assets/textport.png` and `assets/tutorial.png`
- Enhanced visual documentation for better user experience

### Changed

- Updated both English and Japanese README files with visual guides

## [0.2.6] - 2025-05-XX

### Fixed

- Removed trailing period from REFERENCE_COMMENT constant for consistency ([#40](https://github.com/8beeeaaat/touchdesigner-mcp/pull/40))
- Minor code formatting improvements

## [0.2.5] - 2025-05-XX

### Added

- Safe data serialization with `safe_serialize` function ([#38](https://github.com/8beeeaaat/touchdesigner-mcp/pull/38))

### Changed

- Improved import formatting in Python API controller
- Enhanced error handling and data serialization practices

## [0.1.0] - 2025-XX-XX

### Added

- Initial implementation of TouchDesigner MCP Server

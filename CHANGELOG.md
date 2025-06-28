# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

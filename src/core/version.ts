import { createRequire } from "node:module";

const requirePackage = createRequire(import.meta.url);

type PackageJson = {
	version?: string;
	mcpCompatibility?: {
		minApiVersion?: string;
	};
};

const packageJson = requirePackage("../../package.json") as PackageJson;

/**
 * Current MCP server version
 */
export const getMcpServerVersion = () => packageJson.version ?? "0.0.0";
export const MCP_SERVER_VERSION = getMcpServerVersion();

/**
 * Minimum compatible TouchDesigner API Server version required by the MCP server
 *
 * Loaded from package.json's mcpCompatibility.minApiVersion field.
 * Falls back to the current package version if undefined.
 *
 * API Server must be at or above this version.
 * - MAJOR mismatch: Error
 * - MINOR/PATCH differences: Warning or allow
 *
 * Update when:
 * - Introducing breaking API changes
 * - Making incompatible changes to OpenAPI schema
 */
export const getMinCompatibleApiVersion = () =>
	packageJson.mcpCompatibility?.minApiVersion ?? MCP_SERVER_VERSION;
export const MIN_COMPATIBLE_API_VERSION = getMinCompatibleApiVersion();

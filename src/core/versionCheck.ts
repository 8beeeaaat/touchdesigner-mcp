/**
 * Version Compatibility Check
 *
 * Validates API version compatibility between Node.js client and Python server.
 * Ensures users are aware when they need to update the TouchDesigner component.
 */

import semver from "semver";
import packageJson from "../../package.json";

const CLIENT_VERSION = packageJson.version;
export const MIN_SUPPORTED_SERVER_VERSION =
	packageJson.compatibility.minimumServerVersion ?? CLIENT_VERSION;

/**
 * Result of version compatibility check
 */
export interface VersionCheckResult {
	/** Whether versions are compatible */
	compatible: boolean;
	/** Client API version */
	clientVersion: string;
	/** Server API version (may be undefined for old servers) */
	serverVersion: string | undefined;
	/** Warning message if versions are incompatible */
	warning?: string;
	/** Guidance message for resolving version mismatch */
	guidance?: string;
}

/**
 * Check if client and server API versions are compatible
 *
 * Compatibility rules:
 * - Major version must match (breaking changes otherwise)
 * - Server version must be greater than or equal to the minimum supported version
 * - Missing/invalid server version triggers update recommendation
 *
 * @param serverApiVersion - API version from server (may be undefined for old servers)
 * @returns Version check result with compatibility status and guidance
 */
export function checkVersionCompatibility(
	serverApiVersion: string | undefined,
): VersionCheckResult {
	// Case 1: Server doesn't provide apiVersion (old server)
	if (!serverApiVersion || serverApiVersion === "unknown") {
		return {
			clientVersion: CLIENT_VERSION,
			compatible: false,
			guidance: [
				"Your TouchDesigner component didn't report an API version.",
				"This usually means you're using an older MCP component that cannot verify compatibility.",
				"",
				"To resolve this:",
				"1. Replace td/mcp_webserver_base.tox with the latest version",
				"2. Restart TouchDesigner",
				"3. Verify the MCP server can connect",
				"",
				`Minimum supported API version: ${MIN_SUPPORTED_SERVER_VERSION}`,
				`Current client API version: ${CLIENT_VERSION}`,
			].join("\n"),
			serverVersion: serverApiVersion,
			warning:
				"⚠️  Server API version unknown - TouchDesigner component update required",
		};
	}

	const serverSemver = semver.parse(serverApiVersion);
	const clientSemver = semver.parse(CLIENT_VERSION);
	const minimumSemver = semver.parse(MIN_SUPPORTED_SERVER_VERSION);

	if (!serverSemver || !clientSemver || !minimumSemver) {
		return {
			clientVersion: CLIENT_VERSION,
			compatible: false,
			guidance: [
				"Server reported an API version string that couldn't be parsed.",
				"Please update the TouchDesigner component to a supported build.",
				"",
				"To resolve this:",
				"1. Replace td/mcp_webserver_base.tox with the latest version",
				"2. Restart TouchDesigner",
				"3. Verify all MCP tools are working correctly",
				"",
				`Minimum supported API version: ${MIN_SUPPORTED_SERVER_VERSION}`,
				`Current client API version: ${CLIENT_VERSION}`,
			].join("\n"),
			serverVersion: serverApiVersion,
			warning:
				"⚠️  Server API version could not be parsed - TouchDesigner component update required",
		};
	}

	// Case 2: Major version mismatch = incompatible (breaking changes)
	if (serverSemver.major !== clientSemver.major) {
		return {
			clientVersion: CLIENT_VERSION,
			compatible: false,
			guidance: [
				"Major version differences may cause compatibility issues.",
				`  Client API: v${CLIENT_VERSION}`,
				`  Server API: v${serverApiVersion}`,
				"",
				"To resolve this:",
				"1. Replace td/mcp_webserver_base.tox with the latest version",
				"2. Restart TouchDesigner",
				"3. Verify all MCP tools are working correctly",
				"",
				"Note: Major version changes may include breaking API changes.",
			].join("\n"),
			serverVersion: serverApiVersion,
			warning:
				"⚠️  API version mismatch detected - Major versions differ (update required)",
		};
	}

	// Case 3: Server version falls below the supported minimum
	if (semver.lt(serverSemver, minimumSemver)) {
		return {
			clientVersion: CLIENT_VERSION,
			compatible: false,
			guidance: [
				"Server version detected is below the minimum supported API version.",
				`  Minimum supported API: v${MIN_SUPPORTED_SERVER_VERSION}`,
				`  Server API: v${serverApiVersion}`,
				"",
				"To resolve this:",
				"1. Replace td/mcp_webserver_base.tox with the latest version",
				"2. Restart TouchDesigner",
				"3. Verify all MCP tools are working correctly",
				"",
				`Current client API version: v${CLIENT_VERSION}`,
			].join("\n"),
			serverVersion: serverApiVersion,
			warning:
				"⚠️  Server API version is below minimum compatibility - Update required",
		};
	}

	// Case 4: Compatible versions
	return {
		clientVersion: CLIENT_VERSION,
		compatible: true,
		serverVersion: serverSemver.version,
	};
}

/**
 * Format version check warning for logging
 *
 * @param result - Version check result
 * @returns Formatted warning message (empty string if compatible)
 */
export function formatVersionWarning(result: VersionCheckResult): string {
	if (result.compatible) {
		return "";
	}

	const parts = [];

	if (result.warning) {
		parts.push(result.warning);
	}

	if (result.guidance) {
		parts.push("");
		parts.push(result.guidance);
	}

	return parts.join("\n");
}

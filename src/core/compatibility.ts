import semver from "semver";
import { MIN_COMPATIBLE_API_VERSION } from "./version.js";

/**
 * Compatibility is decided by comparing the connected TouchDesigner
 * component's API version against the API version this release ships with
 * (`mcpCompatibility.expectedApiVersion`), bounded below by
 * `mcpCompatibility.minApiVersion`.
 *
 * The npm package version is deliberately NOT part of the decision: the
 * package version and the API version are independent axes, so a package
 * major bump alone must never invalidate deployed components.
 */
export const COMPATIBILITY_POLICY_TYPES = {
	BELOW_MIN_VERSION: "belowMinVersion",
	COMPATIBLE: "compatible",
	COMPONENT_NEWER: "componentNewer",
	COMPONENT_OUTDATED: "componentOutdated",
	NO_VERSION: "noVersion",
	SERVER_OUTDATED: "serverOutdated",
} as const;

export const COMPATIBILITY_POLICY_ERROR_LEVELS = {
	ALLOW: "info",
	ERROR: "error",
	WARNING: "warning",
} as const;

export type CompatibilityPolicyType =
	(typeof COMPATIBILITY_POLICY_TYPES)[keyof typeof COMPATIBILITY_POLICY_TYPES];

export type CompatibilityPolicyErrorLevel =
	(typeof COMPATIBILITY_POLICY_ERROR_LEVELS)[keyof typeof COMPATIBILITY_POLICY_ERROR_LEVELS];

/**
 * Arguments shared by every compatibility message generator
 */
export interface CompatibilityMessageArgs {
	apiVersion: string;
	expectedApiVersion: string;
	mcpVersion: string;
	minRequired: string;
}

/**
 * Compatibility policy configuration
 */
const COMPATIBILITY_POLICY = {
	/**
	 * Behavior when no version information is available
	 * - 'error': Stop processing with error
	 */
	[COMPATIBILITY_POLICY_TYPES.NO_VERSION]: {
		compatible: false,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.ERROR,
		message: generateNoVersionMessage,
	} as const,

	/**
	 * Behavior when API server version is below minimum required version
	 * - 'error': Stop processing with error
	 */
	[COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION]: {
		compatible: false,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.ERROR,
		message: generateMinVersionMessage,
	} as const,

	/**
	 * Behavior when the component's API generation (MAJOR) is newer than this
	 * server release supports
	 * - 'error': Stop processing with error
	 */
	[COMPATIBILITY_POLICY_TYPES.SERVER_OUTDATED]: {
		compatible: false,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.ERROR,
		message: generateServerOutdatedMessage,
	} as const,

	/**
	 * Behavior when the component is older than the API version this release
	 * ships with (but at or above the minimum)
	 * - 'warning': Continue with warning
	 */
	[COMPATIBILITY_POLICY_TYPES.COMPONENT_OUTDATED]: {
		compatible: true,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING,
		message: generateComponentOutdatedMessage,
	} as const,

	/**
	 * Behavior when the component is newer than the API version this release
	 * ships with (same generation)
	 * - 'warning': Continue with warning
	 */
	[COMPATIBILITY_POLICY_TYPES.COMPONENT_NEWER]: {
		compatible: true,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING,
		message: generateComponentNewerMessage,
	} as const,

	/**
	 * Behavior when versions are fully compatible
	 * - 'allow': Allow without logging
	 */
	[COMPATIBILITY_POLICY_TYPES.COMPATIBLE]: {
		compatible: true,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.ALLOW,
		message: generateFullyCompatibleMessage,
	} as const,
} as const;

export const getCompatibilityPolicyType = (params: {
	apiVersion: string;
	expectedApiVersion: string;
}): CompatibilityPolicyType => {
	const apiSemVer = semver.coerce(params.apiVersion);
	const expectedSemVer = semver.coerce(params.expectedApiVersion);

	if (!apiSemVer || !expectedSemVer) {
		return COMPATIBILITY_POLICY_TYPES.NO_VERSION;
	}

	if (semver.lt(apiSemVer, MIN_COMPATIBLE_API_VERSION)) {
		return COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION;
	}

	if (apiSemVer.major > expectedSemVer.major) {
		return COMPATIBILITY_POLICY_TYPES.SERVER_OUTDATED;
	}

	if (semver.lt(apiSemVer, expectedSemVer)) {
		return COMPATIBILITY_POLICY_TYPES.COMPONENT_OUTDATED;
	}

	if (semver.gt(apiSemVer, expectedSemVer)) {
		return COMPATIBILITY_POLICY_TYPES.COMPONENT_NEWER;
	}

	return COMPATIBILITY_POLICY_TYPES.COMPATIBLE;
};

export const getCompatibilityPolicy = (type: CompatibilityPolicyType) => {
	return COMPATIBILITY_POLICY[type];
};

/**
 * Update guide template
 */
const updateGuide = `
Update Guide: https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest#for-updates-from-previous-versions
  1. Download the latest release files from the releases page
  2. Replace TouchDesigner components:
     1. Delete the existing touchdesigner-mcp-td folder from your system
     2. Delete old mcp_webserver_base node from your TouchDesigner project
     3. Extract and import the new mcp_webserver_base.tox to your TouchDesigner project
  3. Restart TouchDesigner and the MCP client (e.g., Claude Desktop)

For more details on compatibility, see: https://github.com/8beeeaaat/touchdesigner-mcp#troubleshooting-version-compatibility
`.trim();

/**
 * Generate error message for unknown version information
 */
export function generateNoVersionMessage(
	args: CompatibilityMessageArgs,
): string {
	return `
🚨 Version Information Missing

MCP Server:  ${args.mcpVersion || "Unknown"}
API Server:  ${args.apiVersion || "Unknown"}

${args.apiVersion ? "" : "You might be using an old tox file from before v1.3.0 released on December 1, 2025, or the TouchDesigner setup might not be done correctly."}
${args.mcpVersion ? "" : "The MCP server version could not be determined. You might be using an outdated MCP server."}

Version information is required to ensure compatibility between the MCP server and TouchDesigner components.
Please ensure both components are updated to latest versions.

${updateGuide}
`.trim();
}

/**
 * Generate error message when API version is below minimum compatible version
 */
export function generateMinVersionMessage(
	args: CompatibilityMessageArgs,
): string {
	return `
⚠️  TouchDesigner API Server Update Required

Current:  ${args.apiVersion}
Required: ${args.minRequired}+

Your TouchDesigner components are outdated and may not support all features.

${updateGuide}
`.trim();
}

/**
 * Generate error message when the component's API generation is newer than
 * this MCP server release supports
 */
export function generateServerOutdatedMessage(
	args: CompatibilityMessageArgs,
): string {
	return `
🚨 MCP Server Update Required

API Server:            ${args.apiVersion}
Supported API version: ${args.expectedApiVersion}

Your TouchDesigner components speak a newer API generation than this MCP server supports.
Update the MCP server (e.g. restart the MCP client so \`npx -y touchdesigner-mcp-server@latest\` picks up the latest release, or update the pinned package version).
`.trim();
}

/**
 * Generate warning message when the component is older than the API version
 * this release ships with
 */
export function generateComponentOutdatedMessage(
	args: CompatibilityMessageArgs,
): string {
	return `
💡 Update Recommended

API Server:         ${args.apiVersion}
Latest API version: ${args.expectedApiVersion}

The MCP server has newer features that may not work with your TouchDesigner components.
Consider updating for the best experience.

${updateGuide}
`.trim();
}

/**
 * Generate warning message when the component is newer than the API version
 * this release ships with (same generation)
 */
export function generateComponentNewerMessage(
	args: CompatibilityMessageArgs,
): string {
	return `
💡 Update Recommended

API Server:            ${args.apiVersion}
Supported API version: ${args.expectedApiVersion}

Your TouchDesigner components have features that may not be supported by the MCP server.
Consider updating the MCP server for the best experience.
`.trim();
}

/**
 * Generate info message when versions are fully compatible
 */
export function generateFullyCompatibleMessage(
	args: CompatibilityMessageArgs,
): string {
	return `
✅ Versions Fully Compatible

MCP Server:  ${args.mcpVersion}
API Server:  ${args.apiVersion}

Your MCP server and TouchDesigner components are fully compatible.
No action is needed.
`.trim();
}

import semver from "semver";
import { MIN_COMPATIBLE_API_VERSION } from "./version.js";

export const COMPATIBILITY_POLICY_TYPES = {
	BELOW_MIN_VERSION: "belowMinVersion",
	COMPATIBLE: "compatible",
	MAJOR_MISMATCH: "majorMismatch",
	NEWER_MINOR: "newerMinor",
	NO_VERSION: "noVersion",
	OLDER_MINOR: "olderMinor",
	PATCH_DIFF: "patchDiff",
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
	 * Behavior when MAJOR versions differ
	 * - 'error': Stop processing with error
	 */
	[COMPATIBILITY_POLICY_TYPES.MAJOR_MISMATCH]: {
		compatible: false,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.ERROR,
		message: generateMajorMismatchMessage,
	} as const,

	/**
	 * Behavior when MCP server has newer MINOR version than API server
	 * - 'warning': Continue with warning only
	 */
	[COMPATIBILITY_POLICY_TYPES.NEWER_MINOR]: {
		compatible: true,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING,
		message: generateNewerMinorMessage,
	} as const,

	/**
	 * Behavior when API server has newer MINOR version than MCP server
	 * - 'warning': Continue with warning
	 */
	[COMPATIBILITY_POLICY_TYPES.OLDER_MINOR]: {
		compatible: true,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING,
		message: generateOlderMinorMessage,
	} as const,

	/**
	 * Behavior when PATCH versions differ
	 * - 'warning': Continue with warning
	 */
	[COMPATIBILITY_POLICY_TYPES.PATCH_DIFF]: {
		compatible: true,
		level: COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING,
		message: generatePatchDiffMessage,
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
	mcpVersion: string;
	apiVersion: string;
}): CompatibilityPolicyType => {
	const mcpSemVer = semver.coerce(params.mcpVersion);
	const apiSemVer = semver.coerce(params.apiVersion);

	if (!mcpSemVer || !apiSemVer) {
		return COMPATIBILITY_POLICY_TYPES.NO_VERSION;
	}

	if (semver.lt(apiSemVer, MIN_COMPATIBLE_API_VERSION)) {
		return COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION;
	}

	if (mcpSemVer.major !== apiSemVer.major) {
		return COMPATIBILITY_POLICY_TYPES.MAJOR_MISMATCH;
	}

	if (mcpSemVer.minor > apiSemVer.minor) {
		return COMPATIBILITY_POLICY_TYPES.NEWER_MINOR;
	}

	if (mcpSemVer.minor < apiSemVer.minor) {
		return COMPATIBILITY_POLICY_TYPES.OLDER_MINOR;
	}

	if (mcpSemVer.patch !== apiSemVer.patch) {
		return COMPATIBILITY_POLICY_TYPES.PATCH_DIFF;
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
Update Guide:
  1. Download the latest release: https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest
  2. Replace TouchDesigner components:
     - Delete the existing touchdesigner-mcp-td folder
     - Extract and import the new mcp_webserver_base.tox
  3. Restart TouchDesigner and the MCP client (e.g., Claude Desktop)

For more details, see: https://github.com/8beeeaaat/touchdesigner-mcp#troubleshooting-version-compatibility
`.trim();

/**
 * Generate error message for unknown version information
 */
export function generateNoVersionMessage(args: {
	apiVersion: string;
	mcpVersion: string;
}): string {
	return `
🚨 Version Information Missing

MCP Server:  ${args.mcpVersion || "Unknown"}
API Server:  ${args.apiVersion || "Unknown"}

Version information is required to ensure compatibility between the MCP server and TouchDesigner components.
Please ensure both components are updated to compatible versions.

${updateGuide}
`.trim();
}

/**
 * Generate error message for MAJOR version mismatch
 */
export function generateMajorMismatchMessage(args: {
	apiVersion: string;
	mcpVersion: string;
}): string {
	return `
🚨 Version Incompatibility Detected

MCP Server:  ${args.mcpVersion}
API Server:  ${args.apiVersion}

MAJOR version mismatch indicates breaking changes.
Both components must be updated to compatible versions.

${updateGuide}
`.trim();
}

/**
 * Generate error message when API version is below minimum compatible version
 */
export function generateMinVersionMessage(args: {
	apiVersion: string;
	minRequired: string;
}): string {
	return `
⚠️  TouchDesigner API Server Update Required

Current:  ${args.apiVersion}
Required: ${args.minRequired}+

Your TouchDesigner components are outdated and may not support all features.

${updateGuide}
`.trim();
}

/**
 * Generate warning message when MCP server has newer MINOR version
 */
export function generateNewerMinorMessage(args: {
	apiVersion: string;
	mcpVersion: string;
}): string {
	return `
💡 Update Recommended

MCP Server:  ${args.mcpVersion}
API Server:  ${args.apiVersion}

The MCP server has newer features that may not work with your TouchDesigner components.
Consider updating for the best experience.

${updateGuide}
`.trim();
}

/**
 * Generate warning message when API server has newer MINOR version
 */
export function generateOlderMinorMessage(args: {
	apiVersion: string;
	mcpVersion: string;
}): string {
	return `
💡 Update Recommended

MCP Server:  ${args.mcpVersion}
API Server:  ${args.apiVersion}

Your TouchDesigner components have features that may not be supported by the MCP server.
Consider updating the MCP server for the best experience.

${updateGuide}
`.trim();
}

/**
 * Generate warning message when PATCH versions differ
 */
export function generatePatchDiffMessage(args: {
	apiVersion: string;
	mcpVersion: string;
}): string {
	return `
💡 Patch Version Mismatch

MCP Server:  ${args.mcpVersion}
API Server:  ${args.apiVersion}

The MCP server and TouchDesigner components have different PATCH versions.
While generally compatible, updating both to the latest versions is recommended.

${updateGuide}
`.trim();
}

/**
 * Generate info message when versions are fully compatible
 *
 * @param mcpVersion MCP server version
 * @param apiVersion TouchDesigner API server version
 * @returns Info message
 */
export function generateFullyCompatibleMessage(args: {
	apiVersion: string;
	mcpVersion: string;
}): string {
	return `
✅ Versions Fully Compatible

MCP Server:  ${args.mcpVersion}
API Server:  ${args.apiVersion}

Your MCP server and TouchDesigner components are fully compatible.
No action is needed.
`.trim();
}

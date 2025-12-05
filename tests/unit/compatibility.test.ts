import { createRequire } from "node:module";
import semver from "semver";
import { describe, expect, test } from "vitest";
import {
	COMPATIBILITY_POLICY_ERROR_LEVELS,
	COMPATIBILITY_POLICY_TYPES,
	getCompatibilityPolicy,
	getCompatibilityPolicyType,
} from "../../src/core/compatibility.js";
import {
	MCP_SERVER_VERSION,
	MIN_COMPATIBLE_API_VERSION,
} from "../../src/core/version.js";

const requirePackage = createRequire(import.meta.url);

describe("Compatibility Configuration", () => {
	test("MIN_COMPATIBLE_API_VERSION is valid semver", () => {
		expect(
			semver.valid(semver.coerce(MIN_COMPATIBLE_API_VERSION)),
		).toBeTruthy();
	});

	test("MIN_COMPATIBLE_API_VERSION <= current MCP_SERVER_VERSION", () => {
		const minVer = semver.coerce(MIN_COMPATIBLE_API_VERSION);
		const currentVer = semver.coerce(MCP_SERVER_VERSION);

		expect(minVer).toBeTruthy();
		expect(currentVer).toBeTruthy();

		if (minVer && currentVer) {
			expect(semver.lte(minVer.version, currentVer.version)).toBe(true);
		}
	});

	test("MCP_SERVER_VERSION matches package.json version", () => {
		const packageJson = requirePackage("../../package.json") as {
			version: string;
		};
		expect(MCP_SERVER_VERSION).toBe(packageJson.version);
	});

	test("MIN_COMPATIBLE_API_VERSION is defined in package.json", () => {
		const packageJson = requirePackage("../../package.json") as {
			mcpCompatibility?: { minApiVersion?: string };
		};
		expect(packageJson.mcpCompatibility?.minApiVersion).toBeDefined();
		expect(packageJson.mcpCompatibility?.minApiVersion).toBe(
			MIN_COMPATIBLE_API_VERSION,
		);
	});
});

describe("semver.coerce behavior", () => {
	test("handles v-prefix correctly", () => {
		expect(semver.coerce("v1.3.0")?.version).toBe("1.3.0");
	});

	test("handles pre-release versions", () => {
		expect(semver.coerce("1.3.0-beta.1")?.version).toBe("1.3.0");
	});

	test("handles build metadata", () => {
		expect(semver.coerce("1.3.0+build.123")?.version).toBe("1.3.0");
	});

	test("returns null for invalid versions", () => {
		expect(semver.coerce("invalid")).toBeNull();
		expect(semver.coerce("")).toBeNull();
	});
});

describe("getCompatibilityPolicyType", () => {
	describe("BELOW_MIN_VERSION cases", () => {
		test("returns BELOW_MIN_VERSION when API version is below minimum", () => {
			const result = getCompatibilityPolicyType("1.3.0", "1.2.9");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION);
		});

		test("returns BELOW_MIN_VERSION when API version is 1.0.0", () => {
			const result = getCompatibilityPolicyType("1.3.0", "1.0.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION);
		});
	});

	describe("MAJOR_MISMATCH cases", () => {
		test("returns MAJOR_MISMATCH when MCP major is higher", () => {
			const result = getCompatibilityPolicyType("2.0.0", "1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.MAJOR_MISMATCH);
		});

		test("returns MAJOR_MISMATCH when API major is higher", () => {
			const result = getCompatibilityPolicyType("1.3.0", "2.0.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.MAJOR_MISMATCH);
		});

		test("returns MAJOR_MISMATCH with different major versions (3.x vs 1.x)", () => {
			const result = getCompatibilityPolicyType("3.0.0", "1.5.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.MAJOR_MISMATCH);
		});
	});

	describe("NEWER_MINOR cases", () => {
		test("returns NEWER_MINOR when MCP minor is higher (1.4.0 vs 1.3.0)", () => {
			const result = getCompatibilityPolicyType("1.4.0", "1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.NEWER_MINOR);
		});

		test("returns NEWER_MINOR when MCP minor is much higher (1.5.0 vs 1.3.0)", () => {
			const result = getCompatibilityPolicyType("1.5.0", "1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.NEWER_MINOR);
		});

		test("returns NEWER_MINOR even with different patch versions", () => {
			const result = getCompatibilityPolicyType("1.4.5", "1.3.2");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.NEWER_MINOR);
		});
	});

	describe("OLDER_MINOR cases", () => {
		test("returns OLDER_MINOR when MCP minor is lower (1.3.0 vs 1.4.0)", () => {
			const result = getCompatibilityPolicyType("1.3.0", "1.4.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.OLDER_MINOR);
		});

		test("returns OLDER_MINOR when MCP minor is much lower (1.3.0 vs 1.5.0)", () => {
			const result = getCompatibilityPolicyType("1.3.0", "1.5.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.OLDER_MINOR);
		});

		test("returns OLDER_MINOR even with different patch versions", () => {
			const result = getCompatibilityPolicyType("1.3.2", "1.4.5");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.OLDER_MINOR);
		});
	});

	describe("PATCH_DIFF cases", () => {
		test("returns PATCH_DIFF when only patch differs (MCP higher)", () => {
			const result = getCompatibilityPolicyType("1.3.2", "1.3.1");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.PATCH_DIFF);
		});

		test("returns PATCH_DIFF when only patch differs (API higher)", () => {
			const result = getCompatibilityPolicyType("1.3.1", "1.3.2");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.PATCH_DIFF);
		});

		test("returns PATCH_DIFF with larger patch difference", () => {
			const result = getCompatibilityPolicyType("1.3.10", "1.3.5");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.PATCH_DIFF);
		});
	});

	describe("COMPATIBLE cases", () => {
		test("returns COMPATIBLE when versions are identical", () => {
			const result = getCompatibilityPolicyType("1.3.0", "1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.COMPATIBLE);
		});

		test("returns COMPATIBLE with same version (different formats)", () => {
			const result = getCompatibilityPolicyType("v1.3.0", "1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.COMPATIBLE);
		});
	});

	describe("edge cases", () => {
		test("handles versions with v-prefix", () => {
			const result = getCompatibilityPolicyType("v1.4.0", "v1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.NEWER_MINOR);
		});

		test("handles pre-release versions (ignores pre-release part)", () => {
			const result = getCompatibilityPolicyType("1.3.0-beta.1", "1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.COMPATIBLE);
		});

		test("handles build metadata (ignores build part)", () => {
			const result = getCompatibilityPolicyType("1.3.0+build.123", "1.3.0");
			expect(result).toBe(COMPATIBILITY_POLICY_TYPES.COMPATIBLE);
		});

		test("throws error for invalid MCP version", () => {
			expect(() => getCompatibilityPolicyType("invalid", "1.3.0")).toThrow(
				"Invalid semver version",
			);
		});

		test("throws error for invalid API version", () => {
			expect(() => getCompatibilityPolicyType("1.3.0", "invalid")).toThrow(
				"Invalid semver version",
			);
		});
	});
});

describe("getCompatibilityPolicy", () => {
	test("BELOW_MIN_VERSION policy has correct properties", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION,
		);
		expect(policy.compatible).toBe(false);
		expect(policy.level).toBe(COMPATIBILITY_POLICY_ERROR_LEVELS.ERROR);
		expect(policy.message).toBeDefined();
	});

	test("MAJOR_MISMATCH policy has correct properties", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.MAJOR_MISMATCH,
		);
		expect(policy.compatible).toBe(false);
		expect(policy.level).toBe(COMPATIBILITY_POLICY_ERROR_LEVELS.ERROR);
		expect(policy.message).toBeDefined();
	});

	test("NEWER_MINOR policy has correct properties", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.NEWER_MINOR,
		);
		expect(policy.compatible).toBe(true);
		expect(policy.level).toBe(COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING);
		expect(policy.message).toBeDefined();
	});

	test("OLDER_MINOR policy has correct properties", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.OLDER_MINOR,
		);
		expect(policy.compatible).toBe(true);
		expect(policy.level).toBe(COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING);
		expect(policy.message).toBeDefined();
	});

	test("PATCH_DIFF policy has correct properties", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.PATCH_DIFF,
		);
		expect(policy.compatible).toBe(true);
		expect(policy.level).toBe(COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING);
		expect(policy.message).toBeDefined();
	});

	test("COMPATIBLE policy has correct properties", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.COMPATIBLE,
		);
		expect(policy.compatible).toBe(true);
		expect(policy.level).toBe(COMPATIBILITY_POLICY_ERROR_LEVELS.ALLOW);
		expect(policy.message).toBeDefined();
	});
});

describe("Compatibility policy message generation", () => {
	test("generates message for BELOW_MIN_VERSION", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION,
		);
		const message = policy.message("1.2.9", MIN_COMPATIBLE_API_VERSION);
		expect(message).toContain("1.2.9");
		expect(message).toContain(MIN_COMPATIBLE_API_VERSION);
		expect(message).toContain("Update Required");
	});

	test("generates message for MAJOR_MISMATCH", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.MAJOR_MISMATCH,
		);
		const message = policy.message("2.0.0", "1.3.0");
		expect(message).toContain("2.0.0");
		expect(message).toContain("1.3.0");
		expect(message).toContain("MAJOR version");
	});

	test("generates message for NEWER_MINOR", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.NEWER_MINOR,
		);
		const message = policy.message("1.4.0", "1.3.0");
		expect(message).toContain("1.4.0");
		expect(message).toContain("1.3.0");
		expect(message).toContain("Update Recommended");
	});

	test("generates message for OLDER_MINOR", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.OLDER_MINOR,
		);
		const message = policy.message("1.3.0", "1.4.0");
		expect(message).toContain("1.3.0");
		expect(message).toContain("1.4.0");
		expect(message).toContain("Update Recommended");
	});

	test("generates message for PATCH_DIFF", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.PATCH_DIFF,
		);
		const message = policy.message("1.3.2", "1.3.1");
		expect(message).toContain("1.3.2");
		expect(message).toContain("1.3.1");
		expect(message).toContain("Patch Version");
	});

	test("generates message for COMPATIBLE", () => {
		const policy = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.COMPATIBLE,
		);
		const message = policy.message("1.3.0", "1.3.0");
		expect(message).toContain("1.3.0");
		expect(message).toContain("Fully Compatible");
	});
});

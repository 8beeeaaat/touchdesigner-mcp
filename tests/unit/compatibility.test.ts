import semver from "semver";
import { describe, expect, test } from "vitest";
import {
	COMPATIBILITY_POLICY_ERROR_LEVELS,
	COMPATIBILITY_POLICY_TYPES,
	getCompatibilityPolicy,
	getCompatibilityPolicyType,
} from "../../src/core/compatibility.js";
import {
	EXPECTED_API_VERSION,
	MIN_COMPATIBLE_API_VERSION,
} from "../../src/core/version.js";

describe("Compatibility Configuration", () => {
	test("MIN_COMPATIBLE_API_VERSION is a valid semver", () => {
		expect(
			semver.valid(semver.coerce(MIN_COMPATIBLE_API_VERSION)),
		).toBeTruthy();
	});

	test("EXPECTED_API_VERSION is a valid semver", () => {
		expect(semver.valid(semver.coerce(EXPECTED_API_VERSION))).toBeTruthy();
	});

	test("EXPECTED_API_VERSION is at or above MIN_COMPATIBLE_API_VERSION", () => {
		expect(
			semver.gte(
				semver.coerce(EXPECTED_API_VERSION) ?? "0.0.0",
				semver.coerce(MIN_COMPATIBLE_API_VERSION) ?? "0.0.0",
			),
		).toBe(true);
	});
});

describe("getCompatibilityPolicyType", () => {
	// The decision compares the component's API version against the API
	// version this release ships with (expectedApiVersion). The npm package
	// version takes no part in the decision — see the regression pin below.

	describe("NO_VERSION cases", () => {
		test.each([
			["", "1.5.0"],
			["abc", "1.5.0"],
			["1.5.0", ""],
			["1.5.0", "not-a-version"],
		])("apiVersion=%j expected=%j → NO_VERSION", (apiVersion, expected) => {
			expect(
				getCompatibilityPolicyType({
					apiVersion,
					expectedApiVersion: expected,
				}),
			).toBe(COMPATIBILITY_POLICY_TYPES.NO_VERSION);
		});
	});

	describe("BELOW_MIN_VERSION cases (floor is minApiVersion)", () => {
		test.each([
			["1.2.9", "1.5.0"],
			["1.0.0", "1.5.0"],
			["0.9.0", "1.3.0"],
		])("apiVersion=%s → BELOW_MIN_VERSION", (apiVersion, expected) => {
			expect(
				getCompatibilityPolicyType({
					apiVersion,
					expectedApiVersion: expected,
				}),
			).toBe(COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION);
		});
	});

	describe("SERVER_OUTDATED cases (component generation newer than supported)", () => {
		test.each([
			["2.0.0", "1.5.0"],
			["3.1.4", "1.5.0"],
			["2.0.0", "1.9.9"],
		])("apiVersion=%s expected=%s → SERVER_OUTDATED", (apiVersion, expected) => {
			expect(
				getCompatibilityPolicyType({
					apiVersion,
					expectedApiVersion: expected,
				}),
			).toBe(COMPATIBILITY_POLICY_TYPES.SERVER_OUTDATED);
		});
	});

	describe("COMPONENT_OUTDATED cases (min ≤ api < expected)", () => {
		test.each([
			["1.3.0", "1.5.0"],
			["1.4.9", "1.5.0"],
			["1.5.0", "1.5.2"],
		])("apiVersion=%s expected=%s → COMPONENT_OUTDATED", (apiVersion, expected) => {
			expect(
				getCompatibilityPolicyType({
					apiVersion,
					expectedApiVersion: expected,
				}),
			).toBe(COMPATIBILITY_POLICY_TYPES.COMPONENT_OUTDATED);
		});
	});

	describe("COMPONENT_NEWER cases (same generation, api > expected)", () => {
		test.each([
			["1.5.1", "1.5.0"],
			["1.6.0", "1.5.0"],
		])("apiVersion=%s expected=%s → COMPONENT_NEWER", (apiVersion, expected) => {
			expect(
				getCompatibilityPolicyType({
					apiVersion,
					expectedApiVersion: expected,
				}),
			).toBe(COMPATIBILITY_POLICY_TYPES.COMPONENT_NEWER);
		});
	});

	describe("COMPATIBLE cases", () => {
		test.each([
			["1.5.0", "1.5.0"],
			["1.5", "1.5.0"],
			["v1.5.0", "1.5.0"],
		])("apiVersion=%s expected=%s → COMPATIBLE", (apiVersion, expected) => {
			expect(
				getCompatibilityPolicyType({
					apiVersion,
					expectedApiVersion: expected,
				}),
			).toBe(COMPATIBILITY_POLICY_TYPES.COMPATIBLE);
		});
	});

	describe("regression pin: package version does not gate compatibility", () => {
		// Before this decoupling, the check compared the npm PACKAGE version's
		// major against the component version, so releasing package 2.0.0 with
		// the API axis at 1.5.0 hard-stopped every tool call against every
		// deployed component. The decision function no longer even accepts the
		// package version: a component matching the shipped API version is
		// compatible no matter what the npm package version says.
		test("component at the shipped API version is COMPATIBLE", () => {
			expect(
				getCompatibilityPolicyType({
					apiVersion: EXPECTED_API_VERSION,
					expectedApiVersion: EXPECTED_API_VERSION,
				}),
			).toBe(COMPATIBILITY_POLICY_TYPES.COMPATIBLE);
		});
	});
});

describe("getCompatibilityPolicy", () => {
	test.each([
		[COMPATIBILITY_POLICY_TYPES.NO_VERSION, false, "error"],
		[COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION, false, "error"],
		[COMPATIBILITY_POLICY_TYPES.SERVER_OUTDATED, false, "error"],
		[COMPATIBILITY_POLICY_TYPES.COMPONENT_OUTDATED, true, "warning"],
		[COMPATIBILITY_POLICY_TYPES.COMPONENT_NEWER, true, "warning"],
		[COMPATIBILITY_POLICY_TYPES.COMPATIBLE, true, "info"],
	])("%s → compatible=%s level=%s", (type, compatible, level) => {
		const policy = getCompatibilityPolicy(type);
		expect(policy.compatible).toBe(compatible);
		expect(policy.level).toBe(level);
	});

	test("error levels enum matches expected values", () => {
		expect(COMPATIBILITY_POLICY_ERROR_LEVELS.ALLOW).toBe("info");
		expect(COMPATIBILITY_POLICY_ERROR_LEVELS.WARNING).toBe("warning");
		expect(COMPATIBILITY_POLICY_ERROR_LEVELS.ERROR).toBe("error");
	});
});

describe("Compatibility policy message generation", () => {
	const details = {
		apiVersion: "1.5.0",
		expectedApiVersion: "1.6.0",
		mcpVersion: "2.0.0",
		minRequired: MIN_COMPATIBLE_API_VERSION,
	};

	test("COMPONENT_OUTDATED message recommends updating the component", () => {
		const message = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.COMPONENT_OUTDATED,
		).message(details);
		expect(message).toContain("Update Recommended");
		expect(message).toContain("1.5.0");
		expect(message).toContain("1.6.0");
		expect(message).toContain("Update Guide");
	});

	test("SERVER_OUTDATED message tells the user to update the MCP server", () => {
		const message = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.SERVER_OUTDATED,
		).message({ ...details, apiVersion: "2.0.0", expectedApiVersion: "1.5.0" });
		expect(message).toContain("MCP Server Update Required");
		expect(message).toContain("2.0.0");
	});

	test("BELOW_MIN_VERSION message names the required floor", () => {
		const message = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.BELOW_MIN_VERSION,
		).message({ ...details, apiVersion: "1.2.0" });
		expect(message).toContain(MIN_COMPATIBLE_API_VERSION);
		expect(message).toContain("1.2.0");
	});

	test("COMPONENT_NEWER message recommends updating the MCP server", () => {
		const message = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.COMPONENT_NEWER,
		).message({ ...details, apiVersion: "1.6.1", expectedApiVersion: "1.6.0" });
		expect(message).toContain("Update Recommended");
		expect(message).toContain("updating the MCP server");
	});

	test("COMPATIBLE message reports full compatibility", () => {
		const message = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.COMPATIBLE,
		).message({ ...details, apiVersion: "1.6.0" });
		expect(message).toContain("Fully Compatible");
	});

	test("NO_VERSION message flags missing version information", () => {
		const message = getCompatibilityPolicy(
			COMPATIBILITY_POLICY_TYPES.NO_VERSION,
		).message({ ...details, apiVersion: "" });
		expect(message).toContain("Version Information Missing");
	});
});

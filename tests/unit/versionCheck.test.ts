import { describe, expect, test } from "vitest";
import {
	checkVersionCompatibility,
	formatVersionWarning,
	MIN_SUPPORTED_SERVER_VERSION,
} from "../../src/core/versionCheck";

describe("Version Compatibility Check", () => {
	describe("checkVersionCompatibility", () => {
		test("should be compatible when versions match exactly", () => {
			const result = checkVersionCompatibility("1.3.0");

			expect(result.compatible).toBe(true);
			expect(result.clientVersion).toBe("1.3.0");
			expect(result.serverVersion).toBe("1.3.0");
			expect(result.warning).toBeUndefined();
			expect(result.guidance).toBeUndefined();
		});

		test("should be compatible when server minor version is newer", () => {
			const result = checkVersionCompatibility("1.5.2");

			expect(result.compatible).toBe(true);
			expect(result.clientVersion).toBe("1.3.0");
			expect(result.serverVersion).toBe("1.5.2");
		});

		test("should be incompatible with different major versions", () => {
			const result = checkVersionCompatibility("2.0.0");

			expect(result.compatible).toBe(false);
			expect(result.clientVersion).toBe("1.3.0");
			expect(result.serverVersion).toBe("2.0.0");
			expect(result.warning).toContain("version mismatch");
			expect(result.guidance).toContain("touchdesigner-mcp-td");
			expect(result.guidance).toContain("restart TouchDesigner");
		});

		test("should be incompatible when server version is undefined", () => {
			const result = checkVersionCompatibility(undefined);

			expect(result.compatible).toBe(false);
			expect(result.clientVersion).toBe("1.3.0");
			expect(result.serverVersion).toBeUndefined();
			expect(result.warning).toContain("unknown");
			expect(result.guidance).toContain(MIN_SUPPORTED_SERVER_VERSION);
		});

		test("should be incompatible when server version is 'unknown'", () => {
			const result = checkVersionCompatibility("unknown");

			expect(result.compatible).toBe(false);
			expect(result.clientVersion).toBe("1.3.0");
			expect(result.serverVersion).toBe("unknown");
			expect(result.warning).toContain("unknown");
			expect(result.guidance).toContain("didn't report an API version");
		});

		test("should be compatible when server patch version is newer", () => {
			const result = checkVersionCompatibility("1.10.5");

			expect(result.compatible).toBe(true);
			expect(result.serverVersion).toBe("1.10.5");
		});

		test("should be incompatible when server version is below minimum", () => {
			const result = checkVersionCompatibility("1.0.0");

			expect(result.compatible).toBe(false);
			expect(result.serverVersion).toBe("1.0.0");
			expect(result.guidance).toContain(MIN_SUPPORTED_SERVER_VERSION);
		});

		test("should be incompatible when server version cannot be parsed", () => {
			const result = checkVersionCompatibility("invalid");

			expect(result.compatible).toBe(false);
			expect(result.serverVersion).toBe("invalid");
			expect(result.warning).toContain("could not be parsed");
		});
	});

	describe("formatVersionWarning", () => {
		test("should return empty string for compatible versions", () => {
			const result = checkVersionCompatibility("1.3.0");
			const warning = formatVersionWarning(result);

			expect(warning).toBe("");
		});

		test("should format warning with guidance for version mismatch", () => {
			const result = checkVersionCompatibility("2.0.0");
			const warning = formatVersionWarning(result);

			expect(warning).toContain("⚠️");
			expect(warning).toContain("version mismatch");
			expect(warning).toContain("Major versions differ");
			expect(warning).toContain("Client API: v1.3.0");
			expect(warning).toContain("Server API: v2.0.0");
			expect(warning).toContain("touchdesigner-mcp-td");
			expect(warning).toContain("restart TouchDesigner");
		});

		test("should format warning for missing server version", () => {
			const result = checkVersionCompatibility(undefined);
			const warning = formatVersionWarning(result);

			expect(warning).toContain("⚠️");
			expect(warning).toContain("unknown");
			expect(warning).toContain("didn't report an API version");
			expect(warning).toContain(MIN_SUPPORTED_SERVER_VERSION);
		});
	});
});

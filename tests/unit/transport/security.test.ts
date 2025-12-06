import { describe, expect, test } from "vitest";
import type { SecurityConfig } from "../../../src/transport/config.js";
import { SecurityPolicy } from "../../../src/transport/security.js";

describe("SecurityPolicy", () => {
	describe("origin validation", () => {
		test("should allow all origins when no restrictions configured", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: [],
			});

			expect(policy.validateOrigin("http://example.com")).toBe(true);
			expect(policy.validateOrigin("https://malicious.com")).toBe(true);
			expect(policy.validateOrigin(undefined)).toBe(true);
		});

		test("should allow exact origin match", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
			});

			expect(policy.validateOrigin("http://localhost:3000")).toBe(true);
			expect(policy.validateOrigin("http://127.0.0.1:3000")).toBe(true);
		});

		test("should reject non-matching origins", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:3000"],
			});

			expect(policy.validateOrigin("http://localhost:4000")).toBe(false);
			expect(policy.validateOrigin("http://example.com")).toBe(false);
			expect(policy.validateOrigin("https://localhost:3000")).toBe(false);
		});

		test("should support wildcard port matching", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:*", "http://127.0.0.1:*"],
			});

			expect(policy.validateOrigin("http://localhost:3000")).toBe(true);
			expect(policy.validateOrigin("http://localhost:4000")).toBe(true);
			expect(policy.validateOrigin("http://localhost:8080")).toBe(true);
			expect(policy.validateOrigin("http://127.0.0.1:3000")).toBe(true);
		});

		test("should reject origins when origin header is missing and restrictions enabled", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:*"],
			});

			expect(policy.validateOrigin(undefined)).toBe(false);
		});

		test("should reject different hostnames with wildcard", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:*"],
			});

			expect(policy.validateOrigin("http://example.com:3000")).toBe(false);
			expect(policy.validateOrigin("http://127.0.0.1:3000")).toBe(false);
		});
	});

	describe("session header validation", () => {
		test("should validate correct UUID v4 format", () => {
			const policy = new SecurityPolicy();

			// Valid UUID v4 examples
			expect(
				policy.validateSessionHeader("550e8400-e29b-41d4-a716-446655440000"),
			).toBe(true);
			expect(
				policy.validateSessionHeader("6ba7b810-9dad-11d1-80b4-00c04fd430c8"),
			).toBe(false); // UUID v1
			expect(
				policy.validateSessionHeader("a3bb189e-8bf9-3888-9912-ace4e6543002"),
			).toBe(false); // UUID v3
			expect(
				policy.validateSessionHeader("123e4567-e89b-42d3-a456-426614174000"),
			).toBe(true); // UUID v4 (4 in third group)
		});

		test("should reject invalid UUID formats", () => {
			const policy = new SecurityPolicy();

			expect(policy.validateSessionHeader("not-a-uuid")).toBe(false);
			expect(policy.validateSessionHeader("123-456-789")).toBe(false);
			expect(
				policy.validateSessionHeader("550e8400-e29b-41d4-a716-44665544000"),
			).toBe(false); // Too short
			expect(
				policy.validateSessionHeader("550e8400-e29b-41d4-a716-4466554400000"),
			).toBe(false); // Too long
			expect(
				policy.validateSessionHeader(
					"550e8400-e29b-41d4-a716-446655440000-extra",
				),
			).toBe(false);
		});

		test("should reject undefined session ID", () => {
			const policy = new SecurityPolicy();

			expect(policy.validateSessionHeader(undefined)).toBe(false);
		});

		test("should be case insensitive", () => {
			const policy = new SecurityPolicy();

			expect(
				policy.validateSessionHeader("550E8400-E29B-41D4-A716-446655440000"),
			).toBe(true);
			expect(
				policy.validateSessionHeader("550e8400-e29b-41d4-a716-446655440000"),
			).toBe(true);
		});

		test("should validate UUID v4 variant bits correctly", () => {
			const policy = new SecurityPolicy();

			// Valid variants (8, 9, a, b in the fourth group first character)
			expect(
				policy.validateSessionHeader("123e4567-e89b-42d3-8456-426614174000"),
			).toBe(true);
			expect(
				policy.validateSessionHeader("123e4567-e89b-42d3-9456-426614174000"),
			).toBe(true);
			expect(
				policy.validateSessionHeader("123e4567-e89b-42d3-a456-426614174000"),
			).toBe(true);
			expect(
				policy.validateSessionHeader("123e4567-e89b-42d3-b456-426614174000"),
			).toBe(true);

			// Invalid variants
			expect(
				policy.validateSessionHeader("123e4567-e89b-42d3-c456-426614174000"),
			).toBe(false);
			expect(
				policy.validateSessionHeader("123e4567-e89b-42d3-f456-426614174000"),
			).toBe(false);
		});
	});

	describe("host header validation", () => {
		test("should allow all hosts when DNS rebinding protection is disabled", () => {
			const policy = new SecurityPolicy({
				enableDnsRebindingProtection: false,
			});

			expect(policy.validateHostHeader("localhost")).toBe(true);
			expect(policy.validateHostHeader("example.com")).toBe(true);
			expect(policy.validateHostHeader("malicious.com")).toBe(true);
			expect(policy.validateHostHeader(undefined)).toBe(true);
		});

		test("should validate against allowed hosts when protection enabled", () => {
			const policy = new SecurityPolicy({
				allowedHosts: ["localhost", "127.0.0.1"],
				enableDnsRebindingProtection: true,
			});

			expect(policy.validateHostHeader("localhost")).toBe(true);
			expect(policy.validateHostHeader("127.0.0.1")).toBe(true);
		});

		test("should reject non-allowed hosts", () => {
			const policy = new SecurityPolicy({
				allowedHosts: ["localhost", "127.0.0.1"],
				enableDnsRebindingProtection: true,
			});

			expect(policy.validateHostHeader("example.com")).toBe(false);
			expect(policy.validateHostHeader("malicious.com")).toBe(false);
			expect(policy.validateHostHeader("192.168.1.1")).toBe(false);
		});

		test("should extract hostname from host:port format", () => {
			const policy = new SecurityPolicy({
				allowedHosts: ["localhost", "127.0.0.1"],
				enableDnsRebindingProtection: true,
			});

			expect(policy.validateHostHeader("localhost:3000")).toBe(true);
			expect(policy.validateHostHeader("127.0.0.1:8080")).toBe(true);
			expect(policy.validateHostHeader("example.com:3000")).toBe(false);
		});

		test("should reject undefined host when protection enabled", () => {
			const policy = new SecurityPolicy({
				allowedHosts: ["localhost"],
				enableDnsRebindingProtection: true,
			});

			expect(policy.validateHostHeader(undefined)).toBe(false);
		});
	});

	describe("security headers", () => {
		test("should apply all security headers", () => {
			const policy = new SecurityPolicy();

			const headers = policy.applySecurityHeaders({
				"Content-Type": "application/json",
			});

			expect(headers).toEqual({
				"Content-Security-Policy": "default-src 'none'",
				"Content-Type": "application/json",
				"X-Content-Type-Options": "nosniff",
				"X-Frame-Options": "DENY",
				"X-XSS-Protection": "1; mode=block",
			});
		});

		test("should preserve existing headers", () => {
			const policy = new SecurityPolicy();

			const headers = policy.applySecurityHeaders({
				"Cache-Control": "no-cache",
				"Content-Type": "application/json",
			});

			expect(headers["Content-Type"]).toBe("application/json");
			expect(headers["Cache-Control"]).toBe("no-cache");
			expect(headers["X-Content-Type-Options"]).toBe("nosniff");
		});

		test("should not override existing security headers", () => {
			const policy = new SecurityPolicy();

			const headers = policy.applySecurityHeaders({
				"X-Frame-Options": "SAMEORIGIN",
			});

			// Should keep the original value
			expect(headers["X-Frame-Options"]).toBe("DENY");
		});
	});

	describe("CORS headers", () => {
		test("should return CORS headers for valid origin", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:*"],
			});

			const headers = policy.getCorsHeaders("http://localhost:3000");

			expect(headers).toEqual({
				"Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id",
				"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
				"Access-Control-Allow-Origin": "http://localhost:3000",
				"Access-Control-Max-Age": "86400",
			});
		});

		test("should return empty headers for invalid origin", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:*"],
			});

			const headers = policy.getCorsHeaders("http://example.com");

			expect(headers).toEqual({});
		});

		test("should return empty headers for undefined origin", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:*"],
			});

			const headers = policy.getCorsHeaders(undefined);

			expect(headers).toEqual({});
		});

		test("should include session header in allowed headers", () => {
			const policy = new SecurityPolicy({
				allowedOrigins: ["http://localhost:*"],
			});

			const headers = policy.getCorsHeaders("http://localhost:3000");

			expect(headers["Access-Control-Allow-Headers"]).toContain(
				"Mcp-Session-Id",
			);
		});
	});

	describe("configuration", () => {
		test("should use default config when none provided", () => {
			const policy = new SecurityPolicy();

			const config = policy.getConfig();

			expect(config.allowedOrigins).toEqual([
				"http://localhost:*",
				"http://127.0.0.1:*",
			]);
			expect(config.allowedHosts).toEqual(["localhost", "127.0.0.1"]);
			expect(config.enableDnsRebindingProtection).toBe(true);
		});

		test("should merge custom config with defaults", () => {
			const customConfig: SecurityConfig = {
				allowedOrigins: ["http://custom.com"],
			};

			const policy = new SecurityPolicy(customConfig);
			const config = policy.getConfig();

			expect(config.allowedOrigins).toEqual(["http://custom.com"]);
			expect(config.allowedHosts).toEqual(["localhost", "127.0.0.1"]); // From defaults
		});

		test("should allow overriding all config values", () => {
			const customConfig: SecurityConfig = {
				allowedHosts: ["custom.host"],
				allowedOrigins: ["http://custom.com"],
				enableDnsRebindingProtection: false,
			};

			const policy = new SecurityPolicy(customConfig);
			const config = policy.getConfig();

			expect(config.allowedOrigins).toEqual(["http://custom.com"]);
			expect(config.allowedHosts).toEqual(["custom.host"]);
			expect(config.enableDnsRebindingProtection).toBe(false);
		});
	});

	describe("integration scenarios", () => {
		test("should validate complete request headers", () => {
			const policy = new SecurityPolicy({
				allowedHosts: ["localhost"],
				allowedOrigins: ["http://localhost:*"],
				enableDnsRebindingProtection: true,
			});

			// Valid request
			expect(policy.validateOrigin("http://localhost:3000")).toBe(true);
			expect(policy.validateHostHeader("localhost:3000")).toBe(true);
			expect(
				policy.validateSessionHeader("550e8400-e29b-41d4-a716-446655440000"),
			).toBe(true);

			// Invalid origin
			expect(policy.validateOrigin("http://example.com")).toBe(false);

			// Invalid host
			expect(policy.validateHostHeader("example.com:3000")).toBe(false);

			// Invalid session
			expect(policy.validateSessionHeader("not-a-uuid")).toBe(false);
		});

		test("should handle localhost development scenario", () => {
			const policy = new SecurityPolicy(); // Use defaults

			// Typical development request
			const origin = "http://localhost:3000";
			const host = "localhost:3001";
			const sessionId = "a3bb189e-8bf9-4888-9912-ace4e6543002";

			expect(policy.validateOrigin(origin)).toBe(true);
			expect(policy.validateHostHeader(host)).toBe(true);
			expect(policy.validateSessionHeader(sessionId)).toBe(true);

			const headers = policy.applySecurityHeaders({});
			expect(headers["X-Content-Type-Options"]).toBe("nosniff");

			const corsHeaders = policy.getCorsHeaders(origin);
			expect(corsHeaders["Access-Control-Allow-Origin"]).toBe(origin);
		});
	});
});

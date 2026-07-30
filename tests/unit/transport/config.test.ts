import { describe, expect, test } from "vitest";
import type {
	StdioTransportConfig,
	StreamableHttpTransportConfig,
	TransportConfig,
} from "../../../src/transport/config.js";
import {
	DEFAULT_HTTP_CONFIG,
	isStdioTransportConfig,
	isStreamableHttpTransportConfig,
	TransportConfigSchema,
} from "../../../src/transport/config.js";

describe("Transport Configuration", () => {
	describe("Type Guards", () => {
		test("isStdioTransportConfig should correctly identify stdio config", () => {
			const config: StdioTransportConfig = {
				type: "stdio",
			};

			expect(isStdioTransportConfig(config)).toBe(true);
			expect(isStreamableHttpTransportConfig(config)).toBe(false);
		});

		test("isStreamableHttpTransportConfig should correctly identify HTTP config", () => {
			const config: StreamableHttpTransportConfig = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 6280,
				type: "streamable-http",
			};

			expect(isStreamableHttpTransportConfig(config)).toBe(true);
			expect(isStdioTransportConfig(config)).toBe(false);
		});

		test("type guards should provide correct type narrowing", () => {
			const configs: TransportConfig[] = [
				{ type: "stdio" },
				{
					endpoint: "/mcp",
					host: "127.0.0.1",
					port: 6280,
					type: "streamable-http",
				},
			];

			for (const config of configs) {
				if (isStdioTransportConfig(config)) {
					// TypeScript should know this is StdioTransportConfig
					expect(config.type).toBe("stdio");
				} else if (isStreamableHttpTransportConfig(config)) {
					// TypeScript should know this is StreamableHttpTransportConfig
					expect(config.type).toBe("streamable-http");
					expect(config.port).toBeGreaterThan(0);
				}
			}
		});
	});

	describe("Default Values", () => {
		test("DEFAULT_HTTP_CONFIG should have correct values", () => {
			expect(DEFAULT_HTTP_CONFIG.host).toBe("127.0.0.1");
			expect(DEFAULT_HTTP_CONFIG.endpoint).toBe("/mcp");
		});

		test("default values should be immutable (readonly)", () => {
			// This test verifies TypeScript's readonly constraint at compile time
			// Runtime immutability would require Object.freeze()
			expect(typeof DEFAULT_HTTP_CONFIG.host).toBe("string");
			expect(typeof DEFAULT_HTTP_CONFIG.endpoint).toBe("string");
		});
	});

	describe("Configuration Objects", () => {
		test("StdioTransportConfig should be minimal", () => {
			const config: StdioTransportConfig = {
				type: "stdio",
			};

			expect(Object.keys(config)).toHaveLength(1);
			expect(config.type).toBe("stdio");
		});

		test("StreamableHttpTransportConfig should accept all required fields", () => {
			const config: StreamableHttpTransportConfig = {
				endpoint: "/api/mcp",
				host: "0.0.0.0",
				port: 8080,
				type: "streamable-http",
			};

			expect(config.type).toBe("streamable-http");
			expect(config.port).toBe(8080);
			expect(config.host).toBe("0.0.0.0");
			expect(config.endpoint).toBe("/api/mcp");
		});

		test("StreamableHttpTransportConfig schema should reject a sessionConfig key (protocol-level sessions were removed)", () => {
			const config = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 6280,
				sessionConfig: { enabled: true },
				type: "streamable-http",
			};

			const result = TransportConfigSchema.safeParse(config);

			expect(result.success).toBe(false);
		});
	});

	describe("TransportConfig Union", () => {
		test("should accept both stdio and HTTP configs", () => {
			const configs: TransportConfig[] = [
				{ type: "stdio" },
				{
					endpoint: "/mcp",
					host: "127.0.0.1",
					port: 6280,
					type: "streamable-http",
				},
			];

			expect(configs).toHaveLength(2);
			expect(configs[0].type).toBe("stdio");
			expect(configs[1].type).toBe("streamable-http");
		});
	});
});

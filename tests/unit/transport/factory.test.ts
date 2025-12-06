import { describe, expect, test } from "vitest";
import type {
	StdioTransportConfig,
	StreamableHttpTransportConfig,
} from "../../../src/transport/config.js";
import { TransportFactory } from "../../../src/transport/factory.js";

describe("TransportFactory", () => {
	describe("stdio transport creation", () => {
		test("should create stdio transport from valid config", () => {
			const config: StdioTransportConfig = {
				type: "stdio",
			};

			const result = TransportFactory.create(config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeDefined();
				// StdioServerTransport should have standard Transport interface methods
				expect(typeof result.data.start).toBe("function");
				expect(typeof result.data.send).toBe("function");
				expect(typeof result.data.close).toBe("function");
			}
		});

		test("should validate config before creating transport", () => {
			const invalidConfig = {
				port: 3000, // Invalid for stdio
				type: "stdio",
			};

			const result = TransportFactory.create(invalidConfig);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});
	});

	describe("streamable-http transport creation", () => {
		test("should return error for HTTP transport (not yet implemented)", () => {
			const config: StreamableHttpTransportConfig = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 3000,
				type: "streamable-http",
			};

			const result = TransportFactory.create(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("not yet implemented");
				expect(result.error.message).toContain("Phase 6");
			}
		});

		test("should validate HTTP config before attempting creation", () => {
			const invalidConfig = {
				endpoint: "/mcp",
				host: "",
				port: 0,
				type: "streamable-http",
			};

			const result = TransportFactory.create(invalidConfig);

			expect(result.success).toBe(false);
			if (!result.success) {
				// Should fail at validation, not implementation
				expect(result.error.message).toContain("validation failed");
			}
		});
	});

	describe("configuration validation", () => {
		test("should reject invalid transport type", () => {
			const invalidConfig = {
				type: "unknown-transport",
			};

			const result = TransportFactory.create(invalidConfig);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});

		test("should reject config missing required fields", () => {
			const invalidConfig = {
				type: "streamable-http",
				// Missing port, host, endpoint
			};

			const result = TransportFactory.create(invalidConfig);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});

		test("should reject null config", () => {
			const result = TransportFactory.create(null);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});

		test("should reject undefined config", () => {
			const result = TransportFactory.create(undefined);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});
	});

	describe("error handling", () => {
		test("should handle stdio transport creation errors gracefully", () => {
			const config: StdioTransportConfig = {
				type: "stdio",
			};

			const result = TransportFactory.create(config);

			// Even if creation fails, should return proper error result
			expect(result).toBeDefined();
			if (!result.success) {
				expect(result.error).toBeInstanceOf(Error);
				expect(result.error.message).toBeDefined();
			}
		});
	});

	describe("type discrimination", () => {
		test("should correctly route stdio config to stdio factory", () => {
			const config: StdioTransportConfig = {
				type: "stdio",
			};

			const result = TransportFactory.create(config);

			// Should create stdio transport (success)
			expect(result.success).toBe(true);
		});

		test("should correctly route HTTP config to HTTP factory", () => {
			const config: StreamableHttpTransportConfig = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 3000,
				type: "streamable-http",
			};

			const result = TransportFactory.create(config);

			// Should attempt HTTP transport (not yet implemented error)
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("not yet implemented");
			}
		});
	});
});

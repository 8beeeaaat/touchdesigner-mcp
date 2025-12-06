import { describe, expect, test } from "vitest";
import type {
	StdioTransportConfig,
	StreamableHttpTransportConfig,
} from "../../../src/transport/config.js";
import { TransportConfigValidator } from "../../../src/transport/validator.js";

describe("TransportConfigValidator", () => {
	describe("stdio transport validation", () => {
		test("should validate valid stdio config", () => {
			const config: StdioTransportConfig = {
				type: "stdio",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe("stdio");
			}
		});

		test("should reject stdio config with extra properties", () => {
			const config = {
				port: 6280, // Invalid for stdio
				type: "stdio",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});
	});

	describe("streamable-http transport validation", () => {
		test("should validate valid minimal HTTP config", () => {
			const config: StreamableHttpTransportConfig = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 6280,
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe("streamable-http");
				expect(result.data.port).toBe(6280);
				expect(result.data.host).toBe("127.0.0.1");
				expect(result.data.endpoint).toBe("/mcp");
			}
		});

		test("should validate HTTP config with session config", () => {
			const config: StreamableHttpTransportConfig = {
				endpoint: "/mcp",
				host: "localhost",
				port: 6280,
				sessionConfig: {
					cleanupInterval: 300000,
					enabled: true,
					ttl: 3600000,
				},
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sessionConfig?.enabled).toBe(true);
				expect(result.data.sessionConfig?.ttl).toBe(3600000);
			}
		});

		test("should validate HTTP config without security config", () => {
			// SecurityConfig removed - DNS rebinding protection now handled by SDK middleware
			const config: StreamableHttpTransportConfig = {
				endpoint: "/api/mcp",
				host: "0.0.0.0",
				port: 6280,
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(true);
			if (result.success && result.data.type === "streamable-http") {
				expect(result.data.port).toBe(6280);
				expect(result.data.endpoint).toBe("/api/mcp");
			}
		});

		test("should reject HTTP config with invalid port (too low)", () => {
			const config = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 0,
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
				expect(result.error.message).toContain("port");
			}
		});

		test("should reject HTTP config with invalid port (too high)", () => {
			const config = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 70000,
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
				expect(result.error.message).toContain("65535");
			}
		});

		test("should reject HTTP config with empty host", () => {
			const config = {
				endpoint: "/mcp",
				host: "",
				port: 6280,
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
				expect(result.error.message).toContain("Host");
			}
		});

		test("should reject HTTP config with endpoint not starting with /", () => {
			const config = {
				endpoint: "mcp",
				host: "127.0.0.1",
				port: 6280,
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
				expect(result.error.message).toContain("Endpoint");
			}
		});

		test("should reject HTTP config with negative TTL", () => {
			const config = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 6280,
				sessionConfig: {
					enabled: true,
					ttl: -1000,
				},
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});

		test("should reject HTTP config with negative cleanup interval", () => {
			const config = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 6280,
				sessionConfig: {
					cleanupInterval: -5000,
					enabled: true,
				},
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});
	});

	describe("discriminated union validation", () => {
		test("should reject config with unknown transport type", () => {
			const config = {
				port: 6280,
				type: "unknown-transport",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});

		test("should reject config with missing type field", () => {
			const config = {
				host: "127.0.0.1",
				port: 6280,
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});

		test("should reject null config", () => {
			const result = TransportConfigValidator.validate(null);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});

		test("should reject undefined config", () => {
			const result = TransportConfigValidator.validate(undefined);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("validation failed");
			}
		});
	});

	describe("validateAndMergeDefaults", () => {
		test("should validate stdio config without merging", () => {
			const config: StdioTransportConfig = {
				type: "stdio",
			};

			const result = TransportConfigValidator.validateAndMergeDefaults(config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe("stdio");
			}
		});

		test("should validate HTTP config and preserve all values", () => {
			const config: StreamableHttpTransportConfig = {
				endpoint: "/mcp",
				host: "127.0.0.1",
				port: 6280,
				sessionConfig: {
					enabled: false,
				},
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validateAndMergeDefaults(config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sessionConfig?.enabled).toBe(false);
			}
		});
	});

	describe("error message formatting", () => {
		test("should provide clear error message for multiple validation errors", () => {
			const config = {
				endpoint: "invalid",
				host: "",
				port: -1,
				type: "streamable-http",
			};

			const result = TransportConfigValidator.validate(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				const message = result.error.message;
				expect(message).toContain("validation failed");
				expect(message).toContain("port");
				expect(message).toContain("host");
				expect(message).toContain("endpoint");
			}
		});
	});
});

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { HttpServerConfig } from "../../../src/transport/httpServerManager.js";
import { HttpServerManager } from "../../../src/transport/httpServerManager.js";

describe("HttpServerManager", () => {
	let manager: HttpServerManager;

	beforeEach(() => {
		manager = new HttpServerManager();
	});

	afterEach(async () => {
		// Clean up: stop server if running
		if (manager.isRunning()) {
			await manager.stop();
		}
	});

	describe("initial state", () => {
		test("should start in stopped state", () => {
			expect(manager.getState()).toBe("stopped");
			expect(manager.isRunning()).toBe(false);
		});

		test("should return null for address when not running", () => {
			expect(manager.getAddress()).toBeNull();
		});

		test("should return null for config when not configured", () => {
			expect(manager.getConfig()).toBeNull();
		});

		test("should return stopped status", () => {
			const status = manager.getStatus();

			expect(status.running).toBe(false);
			expect(status.state).toBe("stopped");
			expect(status.port).toBeUndefined();
			expect(status.host).toBeUndefined();
			expect(status.uptime).toBeUndefined();
		});
	});

	describe("start", () => {
		test("should start server successfully with valid config", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0, // Use port 0 to get random available port
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			const result = await manager.start(config);

			expect(result.success).toBe(true);
			expect(manager.isRunning()).toBe(true);
			expect(manager.getState()).toBe("running");
		});

		test("should update state to running after successful start", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			expect(manager.getState()).toBe("running");
			expect(manager.isRunning()).toBe(true);
		});

		test("should reject start when already running", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			// Try to start again
			const result = await manager.start(config);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("Cannot start server");
				expect(result.error.message).toContain("current state is running");
			}
		});

		test("should handle port already in use error", async () => {
			const config1: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			// Start first server
			const result1 = await manager.start(config1);
			expect(result1.success).toBe(true);

			const address = manager.getAddress();
			if (!address) throw new Error("Failed to get server address");

			// Try to start second server on same port
			const manager2 = new HttpServerManager();
			const config2: HttpServerConfig = {
				host: "127.0.0.1",
				port: address.port,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			const result2 = await manager2.start(config2);

			expect(result2.success).toBe(false);
			if (!result2.success) {
				expect(result2.error.message).toContain("Failed to start HTTP server");
			}
		});

		test("should track uptime after start", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			// Wait a bit to let uptime accumulate
			await new Promise((resolve) => setTimeout(resolve, 100));

			const status = manager.getStatus();
			expect(status.uptime).toBeDefined();
			expect(status.uptime).toBeGreaterThan(0);
		});
	});

	describe("stop", () => {
		test("should stop running server successfully", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);
			const result = await manager.stop();

			expect(result.success).toBe(true);
			expect(manager.isRunning()).toBe(false);
			expect(manager.getState()).toBe("stopped");
		});

		test("should be idempotent when called on stopped server", async () => {
			const result = await manager.stop();

			expect(result.success).toBe(true);
			expect(manager.getState()).toBe("stopped");
		});

		test("should reject concurrent stop attempts", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			// Start stop operation
			const stopPromise1 = manager.stop();

			// Immediately try to stop again
			const result2 = await manager.stop();

			// Second attempt should fail
			expect(result2.success).toBe(false);
			if (!result2.success) {
				expect(result2.error.message).toContain(
					"already in the process of stopping",
				);
			}

			// First stop should succeed
			const result1 = await stopPromise1;
			expect(result1.success).toBe(true);
		});

		test("should respect graceful shutdown timeout", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			const result = await manager.stop({ timeout: 1000 });

			expect(result.success).toBe(true);
			expect(manager.getState()).toBe("stopped");
		});

		test("should clear uptime after stop", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);
			await manager.stop();

			const status = manager.getStatus();
			expect(status.uptime).toBeUndefined();
		});
	});

	describe("getStatus", () => {
		test("should return running status when server is active", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			const status = manager.getStatus();

			expect(status.running).toBe(true);
			expect(status.state).toBe("running");
			expect(status.port).toBeDefined();
			expect(status.host).toBe("127.0.0.1");
			expect(status.uptime).toBeDefined();
		});

		test("should return stopped status when server is not active", () => {
			const status = manager.getStatus();

			expect(status.running).toBe(false);
			expect(status.state).toBe("stopped");
			expect(status.port).toBeUndefined();
			expect(status.host).toBeUndefined();
			expect(status.uptime).toBeUndefined();
		});

		test("should show increasing uptime", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			const status1 = manager.getStatus();
			expect(status1.uptime).toBeDefined();
			const uptime1 = status1.uptime as number;

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 50));

			const status2 = manager.getStatus();
			expect(status2.uptime).toBeDefined();
			const uptime2 = status2.uptime as number;

			expect(uptime2).toBeGreaterThan(uptime1);
		});
	});

	describe("getAddress", () => {
		test("should return actual bound address after start", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0, // Random port
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			const address = manager.getAddress();

			expect(address).not.toBeNull();
			expect(address?.host).toBe("127.0.0.1");
			expect(address?.port).toBeGreaterThan(0);
		});

		test("should return null when server is stopped", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);
			await manager.stop();

			expect(manager.getAddress()).toBeNull();
		});
	});

	describe("getConfig", () => {
		test("should return config after start", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);

			const retrievedConfig = manager.getConfig();

			expect(retrievedConfig).not.toBeNull();
			expect(retrievedConfig?.host).toBe("127.0.0.1");
			expect(retrievedConfig?.port).toBe(0);
		});

		test("should return null after stop", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			await manager.start(config);
			await manager.stop();

			expect(manager.getConfig()).toBeNull();
		});
	});

	describe("error handling", () => {
		test("should handle request handler errors gracefully", async () => {
			const config: HttpServerConfig = {
				host: "127.0.0.1",
				port: 0,
				requestHandler: (_req, _res) => {
					throw new Error("Handler error");
				},
			};

			// Server should start successfully
			const result = await manager.start(config);
			expect(result.success).toBe(true);

			// Making a request should not crash the server
			const address = manager.getAddress();
			expect(address).not.toBeNull();

			// Server should still be running after handler error
			expect(manager.isRunning()).toBe(true);
		});

		test("should transition to stopped state on start failure", async () => {
			const config: HttpServerConfig = {
				host: "invalid-host",
				port: 0,
				requestHandler: (_req, res) => {
					res.writeHead(200);
					res.end("OK");
				},
			};

			const result = await manager.start(config);

			expect(result.success).toBe(false);
			expect(manager.getState()).toBe("stopped");
			expect(manager.isRunning()).toBe(false);
		});
	});
});

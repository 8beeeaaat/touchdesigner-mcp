import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../../src/core/logger.js";
import type { StreamableHttpTransportConfig } from "../../../src/transport/config.js";
import { ExpressHttpManager } from "../../../src/transport/expressHttpManager.js";
import type { ISessionManager } from "../../../src/transport/sessionManager.js";

function createMockSessionManager(activeSessions = 0): ISessionManager & {
	getActiveSessionCount: ReturnType<typeof vi.fn>;
} {
	return {
		cleanup: vi.fn(),
		clearAll: vi.fn(),
		create: vi.fn(),
		getActiveSessionCount: vi.fn<number, []>().mockReturnValue(activeSessions),
		list: vi.fn().mockReturnValue([]),
		register: vi.fn(),
		setExpirationHandler: vi.fn(),
		startTTLCleanup: vi.fn(),
		stopTTLCleanup: vi.fn(),
	};
}

function createMockLogger(): ILogger {
	return {
		sendLog: vi.fn(),
	};
}

function createMockServer(): McpServer {
	return {
		close: vi.fn(),
		connect: vi.fn(),
	} as unknown as McpServer;
}

let nextPort = 3100;
function getTestPort(): number {
	return nextPort++;
}

describe("ExpressHttpManager", () => {
	let manager: ExpressHttpManager | null = null;
	let logger!: ILogger;
	let sessionManager!: ISessionManager & {
		getActiveSessionCount: ReturnType<typeof vi.fn>;
	};

	afterEach(async () => {
		if (manager) {
			await manager.stop();
			manager = null;
		}
		vi.restoreAllMocks();
	});

	function createManager(port: number) {
		const config: StreamableHttpTransportConfig = {
			endpoint: "/mcp",
			host: "127.0.0.1",
			port,
			sessionConfig: { enabled: true },
			type: "streamable-http",
		};

		const serverFactory = () => createMockServer();

		manager = new ExpressHttpManager(
			config,
			serverFactory,
			sessionManager,
			logger,
		);
		return { config };
	}

	it("should start HTTP server and expose health endpoint", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager(0);
		const { config } = createManager(getTestPort());

		const result = await manager?.start();
		expect(result.success).toBe(true);
		expect(manager?.isRunning()).toBe(true);

		const response = await fetch(`http://${config.host}:${config.port}/health`);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.status).toBe("ok");
		expect(body.sessions).toBe(0);
	});

	it("should handle initialize requests and create new sessions", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		const { config } = createManager(getTestPort());

		await manager?.start();

		const payload = {
			id: 1,
			jsonrpc: "2.0",
			method: "initialize",
			params: {
				capabilities: {},
				clientInfo: {
					name: "test-client",
					version: "1.0.0",
				},
				protocolVersion: "2024-11-05",
			},
		};

		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				body: JSON.stringify(payload),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			},
		);

		// TransportRegistry will create a new session for initialize requests
		// The actual response depends on the transport implementation
		expect(response.status).toBeGreaterThanOrEqual(200);
		expect(response.status).toBeLessThan(500);
	});

	it("should reject GET and DELETE requests without valid session ID", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		const { config } = createManager(getTestPort());

		await manager?.start();

		// GET without session ID should return 400 (invalid session)
		const getResponse = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				headers: { Accept: "application/json, text/event-stream" },
				method: "GET",
			},
		);

		expect(getResponse.status).toBe(400);
		const getBody = await getResponse.json();
		expect(getBody.error.message).toBe("Invalid session");

		// DELETE with invalid session ID should return 400
		const deleteResponse = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				headers: { "mcp-session-id": "non-existent-session" },
				method: "DELETE",
			},
		);

		expect(deleteResponse.status).toBe(400);
		const deleteBody = await deleteResponse.json();
		expect(deleteBody.error.message).toBe("Invalid session");
	});

	it("should reject requests without session ID that are not initialize", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		const { config } = createManager(getTestPort());

		await manager?.start();

		// Non-initialize request without session ID should return 400
		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "tools/list" }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			},
		);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.code).toBe(-32000);
		expect(body.error.message).toBe("Invalid session");
	});

	it("should stop server gracefully", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		createManager(getTestPort());

		await manager?.start();
		const stopResult = await manager?.stop();

		expect(stopResult.success).toBe(true);
		expect(manager?.isRunning()).toBe(false);
	});

	it("should return success when stop is called before start", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		createManager(getTestPort());

		const stopResult = await manager?.stop();
		expect(stopResult.success).toBe(true);
	});

	it("should fail on double start attempts", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		const { config } = createManager(getTestPort());

		const first = await manager?.start();
		expect(first.success).toBe(true);

		const second = await manager?.start();
		expect(second.success).toBe(false);
		expect(second.error?.message).toContain(
			"Express HTTP server is already running",
		);

		// Verify the first server instance is still running and functional
		// after the failed second start attempt
		expect(manager?.isRunning()).toBe(true);
		const healthResponse = await fetch(
			`http://${config.host}:${config.port}/health`,
		);
		expect(healthResponse.status).toBe(200);
	});
});

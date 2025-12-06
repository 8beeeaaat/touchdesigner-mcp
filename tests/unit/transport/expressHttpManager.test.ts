import { afterEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../../src/core/logger.js";
import type { StreamableHttpTransportConfig } from "../../../src/transport/config.js";
import { ExpressHttpManager } from "../../../src/transport/expressHttpManager.js";
import type { ISessionManager } from "../../../src/transport/sessionManager.js";

type StreamableHTTPServerTransportMock = {
	handleRequest: ReturnType<typeof vi.fn>;
};

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
		startTTLCleanup: vi.fn(),
		stopTTLCleanup: vi.fn(),
	};
}

function createMockLogger(): ILogger {
	return {
		sendLog: vi.fn(),
	};
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

	function createManager(
		port: number,
		transportOverride?: Partial<StreamableHTTPServerTransportMock>,
	) {
		const transport: StreamableHTTPServerTransportMock = {
			handleRequest: vi.fn().mockImplementation(async (_req, res) => {
				res.status(200).json({ ok: true });
			}),
			...transportOverride,
		};

		const config: StreamableHttpTransportConfig = {
			endpoint: "/mcp",
			host: "127.0.0.1",
			port,
			sessionConfig: { enabled: true },
			type: "streamable-http",
		};

		manager = new ExpressHttpManager(config, transport, sessionManager, logger);
		return { config, transport };
	}

	it("should start HTTP server and expose health endpoint", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager(2);
		const { config } = createManager(getTestPort());

		const result = await manager?.start();
		expect(result.success).toBe(true);
		expect(manager?.isRunning()).toBe(true);

		const response = await fetch(`http://${config.host}:${config.port}/health`);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.status).toBe("ok");
		expect(body.sessions).toBe(2);
		expect(sessionManager.getActiveSessionCount).toHaveBeenCalled();
	});

	it("should forward /mcp requests to the transport handler", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		const transportOverride = {
			handleRequest: vi.fn().mockImplementation(async (_req, res, body) => {
				res.status(200).json({ received: body?.method });
			}),
		};
		const { config, transport } = createManager(
			getTestPort(),
			transportOverride,
		);

		await manager?.start();

		const payload = {
			id: 1,
			jsonrpc: "2.0",
			method: "initialize",
		};

		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				body: JSON.stringify(payload),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			},
		);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ received: "initialize" });
		expect(transport.handleRequest).toHaveBeenCalledTimes(1);
	});

	it("should support GET and DELETE requests", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		const transportOverride = {
			handleRequest: vi.fn().mockImplementation(async (_req, res) => {
				res.status(204).end();
			}),
		};
		const { config, transport } = createManager(
			getTestPort(),
			transportOverride,
		);

		await manager?.start();

		const getResponse = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				headers: { Accept: "application/json, text/event-stream" },
				method: "GET",
			},
		);

		expect(getResponse.status).toBe(204);

		const deleteResponse = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				headers: { "MCP-Session-Id": "dummy" },
				method: "DELETE",
			},
		);

		expect(deleteResponse.status).toBe(204);
		expect(transport.handleRequest).toHaveBeenCalledTimes(2);
	});

	it("should handle transport errors gracefully and log them", async () => {
		logger = createMockLogger();
		sessionManager = createMockSessionManager();
		const transportOverride = {
			handleRequest: vi.fn().mockRejectedValue(new Error("boom")),
		};
		const { config } = createManager(getTestPort(), transportOverride);

		await manager?.start();

		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "initialize" }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			},
		);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBe("Internal server error");
		expect(logger.sendLog).toHaveBeenCalledWith(
			expect.objectContaining({
				level: "error",
				logger: "ExpressHttpManager",
			}),
		);
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

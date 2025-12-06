import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConsoleLogger } from "../../src/core/logger.js";
import { TouchDesignerServer } from "../../src/server/touchDesignerServer.js";
import type { StreamableHttpTransportConfig } from "../../src/transport/config.js";
import { ExpressHttpManager } from "../../src/transport/expressHttpManager.js";
import { SessionManager } from "../../src/transport/sessionManager.js";

describe("HTTP Transport Integration", () => {
	// Use a port range starting at 3302 to avoid conflicts with unit tests (3100+)
	// and other common services. Each test run uses a new port.
	let nextIntegrationPort = 3302;
	function getIntegrationTestPort(): number {
		return nextIntegrationPort++;
	}

	const testPort = getIntegrationTestPort();
	const baseUrl = `http://127.0.0.1:${testPort}`;
	let httpManager: ExpressHttpManager;
	let sessionManager: SessionManager | null = null;
	const ACCEPT_HEADER = "application/json, text/event-stream";
	const PROTOCOL_VERSION = "2024-11-05";
	let activeSessionId: string | null = null;
	let initializationStatus: number | null = null;
	const config: StreamableHttpTransportConfig = {
		endpoint: "/mcp",
		host: "127.0.0.1",
		port: testPort,
		sessionConfig: { enabled: true, ttl: 60_000 },
		type: "streamable-http",
	};

	beforeAll(async () => {
		process.env.TD_WEB_SERVER_HOST = "http://127.0.0.1";
		process.env.TD_WEB_SERVER_PORT = "9981";

		// Create logger for HTTP manager
		const logger = new ConsoleLogger();

		// Create session manager
		sessionManager = new SessionManager({ enabled: true }, logger);

		// Server factory for per-session instances
		const serverFactory = () => TouchDesignerServer.create();

		// Create HTTP manager with factory pattern
		httpManager = new ExpressHttpManager(
			config,
			serverFactory,
			sessionManager,
			logger,
		);

		const startResult = await httpManager.start();
		expect(startResult.success).toBe(true);

		await initializeTransportSession();
	});

	afterAll(async () => {
		await httpManager.stop();
		sessionManager?.stopTTLCleanup();
	});

	async function initializeTransportSession(): Promise<string> {
		if (activeSessionId) {
			return activeSessionId;
		}

		const response = await fetch(`${baseUrl}${config.endpoint}`, {
			body: JSON.stringify({
				id: 1,
				jsonrpc: "2.0",
				method: "initialize",
				params: {
					capabilities: {},
					clientInfo: {
						name: "touchdesigner-mcp-tests",
						version: "0.0.0",
					},
					protocolVersion: PROTOCOL_VERSION,
				},
			}),
			headers: {
				Accept: ACCEPT_HEADER,
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		initializationStatus = response.status;
		activeSessionId = response.headers.get("mcp-session-id");
		await response.body?.cancel();
		if (!activeSessionId) {
			throw new Error("Failed to obtain session ID");
		}
		return activeSessionId;
	}

	it("should handle initialize requests and issue session IDs", () => {
		expect(initializationStatus).toBe(200);
		expect(activeSessionId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
	});

	it("should handle tools/list requests for active sessions", async () => {
		const sessionId = await initializeTransportSession();

		const response = await fetch(`${baseUrl}${config.endpoint}`, {
			body: JSON.stringify({
				id: 2,
				jsonrpc: "2.0",
				method: "tools/list",
			}),
			headers: {
				Accept: ACCEPT_HEADER,
				"Content-Type": "application/json",
				"Mcp-Protocol-Version": PROTOCOL_VERSION,
				"Mcp-Session-Id": sessionId,
			},
			method: "POST",
		});

		expect(response.status).toBe(200);
		const payload = await readFirstSseEvent(response);
		expect(Array.isArray(payload.result?.tools)).toBe(true);
	});

	it("should reject non-initialization requests without session id", async () => {
		const response = await fetch(`${baseUrl}${config.endpoint}`, {
			body: JSON.stringify({
				id: 99,
				jsonrpc: "2.0",
				method: "tools/list",
			}),
			headers: {
				Accept: ACCEPT_HEADER,
				"Content-Type": "application/json",
				"Mcp-Protocol-Version": PROTOCOL_VERSION,
			},
			method: "POST",
		});

		expect(response.status).toBe(400);
	});

	it("should allow new sessions after DELETE", async () => {
		const firstSessionId = await initializeTransportSession();

		const deleteResponse = await fetch(`${baseUrl}${config.endpoint}`, {
			headers: {
				Accept: ACCEPT_HEADER,
				"Mcp-Protocol-Version": PROTOCOL_VERSION,
				"Mcp-Session-Id": firstSessionId,
			},
			method: "DELETE",
		});

		expect(deleteResponse.status).toBe(200);
		await deleteResponse.body?.cancel();

		activeSessionId = null;
		initializationStatus = null;

		const nextSessionId = await initializeTransportSession();
		expect(nextSessionId).toBeDefined();
		expect(nextSessionId).not.toBe(firstSessionId);
	});

	it("should report healthy status via /health", async () => {
		const response = await fetch(`${baseUrl}/health`);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
		expect(body).toHaveProperty("sessions");
	});

	async function readFirstSseEvent(response: Response) {
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error("Missing response body for SSE stream");
		}
		const decoder = new TextDecoder();
		let buffer = "";
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			buffer += decoder.decode(value, { stream: true });
			const eventBoundary = buffer.indexOf("\n\n");
			if (eventBoundary !== -1) {
				const chunk = buffer.slice(0, eventBoundary);
				await reader.cancel();
				const dataLine = chunk
					.split("\n")
					.find((line) => line.startsWith("data: "));
				if (!dataLine) {
					throw new Error("No data event received");
				}
				const jsonString = dataLine.replace("data: ", "");
				return JSON.parse(jsonString);
			}
		}
		await reader.cancel();
		throw new Error("SSE stream ended without data");
	}
});

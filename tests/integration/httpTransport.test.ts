import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConsoleLogger } from "../../src/core/logger.js";
import { TouchDesignerServer } from "../../src/server/touchDesignerServer.js";
import type { StreamableHttpTransportConfig } from "../../src/transport/config.js";
import { ExpressHttpManager } from "../../src/transport/expressHttpManager.js";

const MODERN_PROTOCOL_VERSION = "2026-07-28";
const LEGACY_PROTOCOL_VERSION = "2025-11-25";

function modernEnvelope() {
	return {
		"io.modelcontextprotocol/clientCapabilities": {},
		"io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
	};
}

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
			return JSON.parse(dataLine.replace("data: ", ""));
		}
	}
	await reader.cancel();
	throw new Error("SSE stream ended without data");
}

describe("HTTP Transport Integration", () => {
	// Use a port range starting at 3302 to avoid conflicts with unit tests (3100+)
	// and other common services.
	const testPort = 3302;
	const baseUrl = `http://127.0.0.1:${testPort}`;
	let httpManager: ExpressHttpManager;
	const config: StreamableHttpTransportConfig = {
		endpoint: "/mcp",
		host: "127.0.0.1",
		port: testPort,
		type: "streamable-http",
	};

	beforeAll(async () => {
		process.env.TD_WEB_SERVER_HOST = "http://127.0.0.1";
		process.env.TD_WEB_SERVER_PORT = "9981";

		const logger = new ConsoleLogger();

		// Server factory for per-request instances (stateless serving)
		const serverFactory = () => TouchDesignerServer.create();

		httpManager = new ExpressHttpManager(config, serverFactory, logger);

		const startResult = await httpManager.start();
		expect(startResult.success).toBe(true);
	});

	afterAll(async () => {
		await httpManager.stop();
	});

	it("should serve a legacy initialize request as SSE without a session id header", async () => {
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
					protocolVersion: LEGACY_PROTOCOL_VERSION,
				},
			}),
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
			},
			method: "POST",
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("mcp-session-id")).toBeNull();

		const payload = await readFirstSseEvent(response);
		expect(payload.result?.protocolVersion).toBe(LEGACY_PROTOCOL_VERSION);
	});

	it("should handle modern server/discover requests", async () => {
		const response = await fetch(`${baseUrl}${config.endpoint}`, {
			body: JSON.stringify({
				id: 2,
				jsonrpc: "2.0",
				method: "server/discover",
				params: { _meta: modernEnvelope() },
			}),
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
				"MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
				"Mcp-Method": "server/discover",
			},
			method: "POST",
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.result?.supportedVersions).toContain(MODERN_PROTOCOL_VERSION);
	});

	it("should handle modern tools/list requests for active sessions", async () => {
		const response = await fetch(`${baseUrl}${config.endpoint}`, {
			body: JSON.stringify({
				id: 3,
				jsonrpc: "2.0",
				method: "tools/list",
				params: { _meta: modernEnvelope() },
			}),
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
				"MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
				"Mcp-Method": "tools/list",
			},
			method: "POST",
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(Array.isArray(body.result?.tools)).toBe(true);
		expect(body.result?.tools).toHaveLength(14);
		expect(body.result?.resultType).toBe("complete");
		expect(body.result?.ttlMs).toBe(0);
		expect(body.result?.cacheScope).toBe("private");
	});

	it("should reject GET requests with 405 (protocol-level sessions were removed)", async () => {
		const response = await fetch(`${baseUrl}${config.endpoint}`, {
			method: "GET",
		});

		expect(response.status).toBe(405);
	});

	it("should reject DELETE requests with 405 (protocol-level sessions were removed)", async () => {
		const response = await fetch(`${baseUrl}${config.endpoint}`, {
			method: "DELETE",
		});

		expect(response.status).toBe(405);
	});

	it("should report healthy status via /health without a sessions field", async () => {
		const response = await fetch(`${baseUrl}/health`);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe("ok");
		expect(body).not.toHaveProperty("sessions");
	});
});

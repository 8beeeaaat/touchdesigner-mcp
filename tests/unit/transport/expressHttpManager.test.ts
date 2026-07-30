import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConsoleLogger } from "../../../src/core/logger.js";
import { TouchDesignerServer } from "../../../src/server/touchDesignerServer.js";
import type { StreamableHttpTransportConfig } from "../../../src/transport/config.js";
import { ExpressHttpManager } from "../../../src/transport/expressHttpManager.js";

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
		if (done) break;
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

let nextPort = 3100;
function getTestPort(): number {
	return nextPort++;
}

describe("ExpressHttpManager", () => {
	let manager: ExpressHttpManager;
	let config: StreamableHttpTransportConfig;

	beforeEach(() => {
		process.env.TD_WEB_SERVER_HOST = "http://127.0.0.1";
		process.env.TD_WEB_SERVER_PORT = "9981";

		config = {
			endpoint: "/mcp",
			host: "127.0.0.1",
			port: getTestPort(),
			type: "streamable-http",
		};

		manager = new ExpressHttpManager(
			config,
			() => TouchDesignerServer.create(),
			new ConsoleLogger(),
		);
	});

	afterEach(async () => {
		await manager.stop();
	});

	it("should expose a health endpoint with status and timestamp but no sessions field", async () => {
		const startResult = await manager.start();
		expect(startResult.success).toBe(true);

		const response = await fetch(`http://${config.host}:${config.port}/health`);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.status).toBe("ok");
		expect(typeof body.timestamp).toBe("string");
		expect(body).not.toHaveProperty("sessions");
	});

	it("should serve a legacy initialize request without issuing a session id", async () => {
		await manager.start();

		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				body: JSON.stringify({
					id: 1,
					jsonrpc: "2.0",
					method: "initialize",
					params: {
						capabilities: {},
						clientInfo: { name: "test-client", version: "1.0.0" },
						protocolVersion: LEGACY_PROTOCOL_VERSION,
					},
				}),
				headers: {
					Accept: "application/json, text/event-stream",
					"Content-Type": "application/json",
				},
				method: "POST",
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("mcp-session-id")).toBeNull();

		const payload = await readFirstSseEvent(response);
		expect(payload.result?.protocolVersion).toBe(LEGACY_PROTOCOL_VERSION);
	});

	it("should reject GET requests with 405 (protocol-level sessions were removed)", async () => {
		await manager.start();

		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				method: "GET",
			},
		);

		expect(response.status).toBe(405);
	});

	it("should reject DELETE requests with 405 (protocol-level sessions were removed)", async () => {
		await manager.start();

		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				method: "DELETE",
			},
		);

		expect(response.status).toBe(405);
	});

	it("should serve a modern tools/list request as a complete, non-cacheable JSON result", async () => {
		await manager.start();

		const response = await fetch(
			`http://${config.host}:${config.port}${config.endpoint}`,
			{
				body: JSON.stringify({
					id: 2,
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
			},
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(Array.isArray(body.result?.tools)).toBe(true);
		expect(body.result?.resultType).toBe("complete");
		expect(body.result?.ttlMs).toBe(0);
		expect(body.result?.cacheScope).toBe("private");
	});

	it("should return success when stop is called before start", async () => {
		const stopResult = await manager.stop();
		expect(stopResult.success).toBe(true);
	});

	it("should report isRunning() true after start and false after stop", async () => {
		expect(manager.isRunning()).toBe(false);

		await manager.start();
		expect(manager.isRunning()).toBe(true);

		await manager.stop();
		expect(manager.isRunning()).toBe(false);
	});

	it("should fail on double start attempts while leaving the running server intact", async () => {
		const first = await manager.start();
		expect(first.success).toBe(true);

		const second = await manager.start();
		expect(second.success).toBe(false);
		if (!second.success) {
			expect(second.error.message).toContain(
				"Express HTTP server is already running",
			);
		}

		expect(manager.isRunning()).toBe(true);
		const healthResponse = await fetch(
			`http://${config.host}:${config.port}/health`,
		);
		expect(healthResponse.status).toBe(200);
	});
});

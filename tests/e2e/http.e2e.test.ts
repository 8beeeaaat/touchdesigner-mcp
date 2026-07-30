import {
	Client,
	StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
	type HttpServerHandle,
	startHttpServer,
	uniquePort,
} from "./helpers/serverProcess.js";

/**
 * E2E: Streamable HTTP transport against the BUILT server (dist/cli.js),
 * driven by the real MCP SDK v2 client over the wire.
 *
 * Covers both protocol eras served by the same endpoint:
 * - 2026-07-28 negotiated via the server/discover probe (modern era)
 * - 2025-era clients served through the stateless legacy fallback
 */
describe("E2E: Streamable HTTP", () => {
	let server: HttpServerHandle;
	let client: Client | null = null;

	beforeAll(async () => {
		server = await startHttpServer(uniquePort(0));
	}, 30_000);

	afterAll(async () => {
		await server.stop();
	});

	afterEach(async () => {
		if (client) {
			await client.close();
			client = null;
		}
	});

	function newTransport() {
		return new StreamableHTTPClientTransport(new URL(server.mcpUrl));
	}

	it("negotiates protocol revision 2026-07-28 with versionNegotiation auto", async () => {
		client = new Client(
			{ name: "e2e-http-modern", version: "0.0.1" },
			{ versionNegotiation: { mode: "auto" } },
		);
		await client.connect(newTransport());

		expect(client.getProtocolEra()).toBe("modern");
		expect(client.getServerVersion()).toMatchObject({ name: "TouchDesigner" });
	}, 30_000);

	it("serves tools, tool calls, and prompts on a pinned 2026-07-28 connection", async () => {
		client = new Client(
			{ name: "e2e-http-pinned", version: "0.0.1" },
			{ versionNegotiation: { mode: { pin: "2026-07-28" } } },
		);
		await client.connect(newTransport());

		const { tools } = await client.listTools();
		expect(tools).toHaveLength(14);
		const toolNames = tools.map((tool) => tool.name);
		expect(toolNames).toContain("describe_td_tools");
		expect(toolNames).toContain("get_top_image");

		// describe_td_tools is TD-independent: exercises the full tools/call path.
		const result = await client.callTool({
			arguments: { filter: "get_top_image" },
			name: "describe_td_tools",
		});
		expect(result.isError).toBeFalsy();
		const [block] = result.content as Array<{ type: string; text?: string }>;
		expect(block.type).toBe("text");
		expect(block.text).toContain("get_top_image");

		const prompt = await client.getPrompt({
			arguments: { nodeName: "wave1" },
			name: "Search node",
		});
		const [message] = prompt.messages;
		expect(message.role).toBe("user");
		expect(message.content).toMatchObject({ type: "text" });
		expect((message.content as { text: string }).text).toContain("wave1");
	}, 30_000);

	it("serves 2025-era clients through the stateless legacy fallback", async () => {
		// Default mode performs the classic 2025 initialize handshake.
		client = new Client({ name: "e2e-http-legacy", version: "0.0.1" });
		await client.connect(newTransport());

		expect(client.getProtocolEra()).toBe("legacy");
		expect(client.getServerVersion()).toMatchObject({ name: "TouchDesigner" });

		const { tools } = await client.listTools();
		expect(tools).toHaveLength(14);
	}, 30_000);

	it("answers /health without a sessions field (stateless serving)", async () => {
		const res = await fetch(`${server.url}/health`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.status).toBe("ok");
		expect(body).not.toHaveProperty("sessions");
	});
});

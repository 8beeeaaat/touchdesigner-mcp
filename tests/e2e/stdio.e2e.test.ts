import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertBuilt, CLI_PATH, TD_ARGS } from "./helpers/serverProcess.js";

/**
 * E2E: stdio transport against the BUILT server (dist/cli.js), spawned the
 * way an MCP host (Claude Desktop etc.) would spawn it.
 *
 * serveStdio owns the era decision per connection: a modern client probes
 * with server/discover, a legacy client opens with the 2025 initialize
 * handshake — both against the same binary.
 */
describe("E2E: stdio", () => {
	let client: Client | null = null;

	beforeAll(() => {
		assertBuilt();
	});

	afterEach(async () => {
		if (client) {
			await client.close();
			client = null;
		}
	});

	function newTransport() {
		return new StdioClientTransport({
			args: [CLI_PATH, ...TD_ARGS],
			command: process.execPath,
			stderr: "ignore",
		});
	}

	it("negotiates protocol revision 2026-07-28 with versionNegotiation auto", async () => {
		client = new Client(
			{ name: "e2e-stdio-modern", version: "0.0.1" },
			{ versionNegotiation: { mode: "auto" } },
		);
		await client.connect(newTransport());

		expect(client.getProtocolEra()).toBe("modern");
		expect(client.getServerVersion()).toMatchObject({ name: "TouchDesigner" });

		const { tools } = await client.listTools();
		expect(tools).toHaveLength(14);

		const result = await client.callTool({
			arguments: { filter: "get_top_image" },
			name: "describe_td_tools",
		});
		expect(result.isError).toBeFalsy();
		const [block] = result.content as Array<{ type: string; text?: string }>;
		expect(block.type).toBe("text");
		expect(block.text).toContain("get_top_image");
	}, 30_000);

	it("serves 2025-era clients through the legacy initialize handshake", async () => {
		client = new Client({ name: "e2e-stdio-legacy", version: "0.0.1" });
		await client.connect(newTransport());

		expect(client.getProtocolEra()).toBe("legacy");
		expect(client.getServerVersion()).toMatchObject({ name: "TouchDesigner" });

		const prompt = await client.getPrompt({
			arguments: { nodePath: "/project1/wave1" },
			name: "Check node errors",
		});
		const [message] = prompt.messages;
		expect((message.content as { text: string }).text).toContain(
			"/project1/wave1",
		);
	}, 30_000);
});

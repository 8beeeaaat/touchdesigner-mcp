import { TOOL_NAMES } from "../src/core/constants.js";
import type { ILogger } from "../src/core/logger.js";
import { registerTdTools } from "../src/features/tools/handlers/tdTools.js";
import { TouchDesignerClient } from "../src/tdClient/touchDesignerClient.js";

type ToolHandler = (params?: Record<string, unknown>) => Promise<unknown>;

type ToolEntry = {
	description?: string;
	handler: ToolHandler;
};

class MockMcpServer {
	public tools = new Map<string, ToolEntry>();

	tool(name: string, ...rest: unknown[]): void {
		const args = [...rest];
		if (typeof args[0] === "string") {
			args.shift();
		}
		const handler = args.pop();
		if (typeof handler === "function") {
			this.tools.set(name, { handler: handler as ToolHandler });
			return;
		}
		throw new Error(`Unsupported tool registration signature for ${name}`);
	}

	getTool(name: string): ToolEntry {
		const tool = this.tools.get(name);
		if (!tool) throw new Error(`Tool ${name} not registered`);
		return tool;
	}
}

const logger: ILogger = {
	debug: () => {},
	error: console.error,
	log: () => {},
	warn: console.warn,
};

async function callTool(
	tool: ToolEntry,
	params: Record<string, unknown>,
): Promise<string> {
	const result = (await tool.handler(params)) as {
		content?: Array<{ type: string; text?: string }>;
	};
	return (result.content ?? [])
		.filter((item) => item.type === "text")
		.map((item) => item.text ?? "")
		.join("\n\n");
}

async function previewResponse(
	tool: ToolEntry,
	params: Record<string, unknown>,
): Promise<void> {
	console.log(
		`\n=== ${params.detailLevel ?? "summary"} (${params.responseFormat ?? "plain"}) ===`,
	);
	const text = await callTool(tool, params);
	console.log(text);
}

async function main() {
	process.env.TD_WEB_SERVER_HOST ||= "http://127.0.0.1";
	process.env.TD_WEB_SERVER_PORT ||= "9981";

	const server = new MockMcpServer();
	const tdClient = new TouchDesignerClient();

	registerTdTools(
		server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
		logger,
		tdClient,
	);

	const tool = server.getTool(TOOL_NAMES.GET_TD_NODES);

	const scenarios = [
		{ responseFormat: "yaml" },
		{ responseFormat: "json" },
		{ responseFormat: "markdown" },
		{
			detailLevel: "detailed",
			includeProperties: true,
			responseFormat: "yaml",
		},
		{
			detailLevel: "detailed",
			includeProperties: true,
			responseFormat: "json",
		},
		{
			detailLevel: "detailed",
			includeProperties: true,
			responseFormat: "markdown",
		},
	];

	for (const scenario of scenarios) {
		await previewResponse(tool, {
			limit: 5,
			parentPath: "/project1",
			...scenario,
		});
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

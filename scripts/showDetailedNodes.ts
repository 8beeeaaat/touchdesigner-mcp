import { TOOL_NAMES } from "../src/core/constants.js";
import type { ILogger } from "../src/core/logger.js";
import { registerTdTools } from "../src/features/tools/handlers/tdTools.js";
import { TouchDesignerClient } from "../src/tdClient/touchDesignerClient.js";

type ToolHandler = (params?: Record<string, unknown>) => Promise<unknown>;

type ToolEntry = {
	handler: ToolHandler;
};

class MockMcpServer {
	public tools = new Map<string, ToolEntry>();

	tool(name: string, ...args: unknown[]): void {
		const rest = [...args];
		if (typeof rest[0] === "string") {
			rest.shift();
		}
		if (rest.length === 1 && typeof rest[0] === "function") {
			this.tools.set(name, { handler: rest[0] as ToolHandler });
			return;
		}
		if (rest.length === 2 && typeof rest[1] === "function") {
			this.tools.set(name, { handler: rest[1] as ToolHandler });
			return;
		}
		throw new Error(`Unsupported registration signature for ${name}`);
	}

	getTool(name: string): ToolEntry {
		const tool = this.tools.get(name);
		if (!tool) throw new Error(`Tool ${name} not registered`);
		return tool;
	}
}

const logger: ILogger = {
	sendLog: ({ level, data }) => {
		if (level === "error") {
			console.error(data);
			return;
		}
		if (level === "warning") {
			console.warn(data);
			return;
		}
		console.log(data);
	},
};

async function callTool(tool: ToolEntry, params?: Record<string, unknown>) {
	const result = (await tool.handler(params)) as {
		content?: Array<{ type: string; text?: string }>;
	};
	return (result.content ?? [])
		.filter((item) => item.type === "text")
		.map((item) => item.text ?? "")
		.join("\n\n");
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

	const yamlResponse = await callTool(tool, {
		detailLevel: "detailed",
		includeProperties: true,
		parentPath: "/project1",
		responseFormat: "yaml",
	});

	const jsonResponse = await callTool(tool, {
		detailLevel: "detailed",
		includeProperties: true,
		parentPath: "/project1",
		responseFormat: "json",
	});

	const markdownResponse = await callTool(tool, {
		detailLevel: "summary",
		includeProperties: true,
		parentPath: "/project1",
		responseFormat: "markdown",
	});

	console.log(`=== YAML Detailed Response ===\n${yamlResponse}\n`);
	console.log(`=== JSON Detailed Response ===\n${jsonResponse}\n`);
	console.log(`=== Markdown Summary Response ===\n${markdownResponse}\n`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

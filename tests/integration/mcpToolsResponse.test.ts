import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../../src/core/constants.js";
import type { ILogger } from "../../src/core/logger.js";
import { registerTools } from "../../src/features/tools/register.js";
import type { ExecNodeMethodRequest } from "../../src/gen/endpoints/TouchDesignerAPI";
import type { TouchDesignerClient } from "../../src/tdClient/index.js";

type ToolHandler = (params?: Record<string, unknown>) => Promise<unknown>;

class MockMcpServer {
	public tools = new Map<string, ToolHandler>();

	tool(name: string, ...rest: unknown[]): void {
		const args = [...rest];
		const handler = args.pop();
		if (typeof handler === "function") {
			this.tools.set(name, handler as ToolHandler);
		}
	}

	getTool(name: string): ToolHandler {
		const tool = this.tools.get(name);
		if (!tool) throw new Error(`Tool ${name} not registered`);
		return tool;
	}
}

const logger: ILogger = {
	debug: () => {},
	log: () => {},
	warn: () => {},
	error: () => {},
};

function createMockTdClient(): TouchDesignerClient {
	const execNodeMethod: TouchDesignerClient["execNodeMethod"] = async <
		DATA extends NonNullable<{ result: unknown }>,
	>(
		_params: ExecNodeMethodRequest,
	) => ({ success: true, data: { result: [] } as DATA });

	const mock = {
		getNodes: async (_params: unknown) => ({
			success: true,
			data: {
				nodes: [
					{
						id: 1,
						name: "geo1",
						path: "/project1/geo1",
						opType: "geometry",
						properties: {},
					},
					{
						id: 2,
						name: "text1",
						path: "/project1/text1",
						opType: "textTOP",
						properties: {},
					},
				],
				parentPath: "/project1",
			},
		}),
		getNodeDetail: async (_params: unknown) => ({
			success: true,
			data: {
				id: 10,
				name: "webserverDAT",
				path: "/project1/webserverDAT",
				opType: "webServerDAT",
				properties: { port: 9981, active: true },
			},
		}),
		getClasses: (async () => ({
			success: true,
			data: {
				classes: [
					{ name: "OP", type: "class", description: "Base operator" },
					{ name: "COMP", type: "class", description: "Component" },
				],
			},
		})) as TouchDesignerClient["getClasses"],
		getClassDetails: async (_className: unknown) => ({
			success: true,
			data: {
				name: "OP",
				type: "class",
				description: "Base operator",
				methods: [{ name: "op", signature: "op(path)", description: "find" }],
				properties: [{ name: "name", type: "string" }],
			},
		}),
		execPythonScript: (async (_params: unknown) => ({
			success: true,
			data: { result: { value: ["geo1", "text1"] } },
		})) as TouchDesignerClient["execPythonScript"],
		getTdInfo: (async () => ({
			success: true,
			data: {
				server: "mock",
				version: "0.0.0",
				osName: "test-os",
				osVersion: "0.0.0",
			},
		})) as TouchDesignerClient["getTdInfo"],
		createNode: (async (_params: unknown) => ({
			success: true,
			data: {
				result: {
					id: 1,
					name: "mock",
					path: "/project1/mock",
					opType: "textTOP",
					properties: {},
				},
			},
		})) as TouchDesignerClient["createNode"],
		updateNode: async (_params: unknown) => ({
			success: true,
			data: { updated: ["a"] },
		}),
		deleteNode: async (_params: unknown) => ({
			success: true,
			data: { deleted: true },
		}),
		execNodeMethod,
	} satisfies Partial<TouchDesignerClient>;

	return mock as unknown as TouchDesignerClient;
}

describe("MCP tool responses", () => {
	const server = new MockMcpServer();
	registerTools(
		server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
		logger,
		createMockTdClient(),
	);

	it("returns formatted node list for GET_TD_NODES", async () => {
		const handler = server.getTool(TOOL_NAMES.GET_TD_NODES);
		const result = (await handler({
			parentPath: "/project1",
			detailLevel: "summary",
			responseFormat: "markdown",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};

		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("Nodes in /project1");
		expect(text).toContain("geo1");
		expect(text).toContain("text1");
	});

	it("returns formatted node parameters for GET_TD_NODE_PARAMETERS", async () => {
		const handler = server.getTool(TOOL_NAMES.GET_TD_NODE_PARAMETERS);
		const result = (await handler({
			nodePath: "/project1/webserverDAT",
			detailLevel: "summary",
			responseFormat: "markdown",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("webserverDAT");
		expect(text).toContain("Properties shown");
	});

	it("returns formatted class list for GET_TD_CLASSES", async () => {
		const handler = server.getTool(TOOL_NAMES.GET_TD_CLASSES);
		const result = (await handler({
			detailLevel: "summary",
			responseFormat: "markdown",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("TouchDesigner Classes");
		expect(text).toContain("OP");
	});

	it("returns formatted script result for EXECUTE_PYTHON_SCRIPT", async () => {
		const handler = server.getTool(TOOL_NAMES.EXECUTE_PYTHON_SCRIPT);
		const result = (await handler({
			script: "op('/project1').children",
			detailLevel: "summary",
			responseFormat: "markdown",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("Script Result");
		expect(text).toContain("Return type");
	});

	it("returns filesystem manifest for DESCRIBE_TD_TOOLS", async () => {
		const handler = server.getTool(TOOL_NAMES.DESCRIBE_TD_TOOLS);
		const result = (await handler({
			filter: "class",
			detailLevel: "summary",
			responseFormat: "markdown",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};

		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("getTdClasses");
		expect(text).toContain("getTdClassDetails");
		expect(text).toContain("servers/touchdesigner");
	});
});

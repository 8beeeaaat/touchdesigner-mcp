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
	error: () => {},
	log: () => {},
	warn: () => {},
};

function createMockTdClient(): TouchDesignerClient {
	const execNodeMethod: TouchDesignerClient["execNodeMethod"] = async <
		DATA extends NonNullable<{ result: unknown }>,
	>(
		_params: ExecNodeMethodRequest,
	) => ({ data: { result: [] } as DATA, success: true });

	const mock = {
		createNode: (async (_params: unknown) => ({
			data: {
				result: {
					id: 1,
					name: "mock",
					opType: "textTOP",
					path: "/project1/mock",
					properties: {},
				},
			},
			success: true,
		})) as TouchDesignerClient["createNode"],
		deleteNode: async (_params: unknown) => ({
			data: { deleted: true },
			success: true,
		}),
		execNodeMethod,
		execPythonScript: (async (_params: unknown) => ({
			data: { result: { value: ["geo1", "text1"] } },
			success: true,
		})) as TouchDesignerClient["execPythonScript"],
		getClassDetails: async (_className: unknown) => ({
			data: {
				description: "Base operator",
				methods: [{ description: "find", name: "op", signature: "op(path)" }],
				name: "OP",
				properties: [{ name: "name", type: "string" }],
				type: "class",
			},
			success: true,
		}),
		getClasses: (async () => ({
			data: {
				classes: [
					{ description: "Base operator", name: "OP", type: "class" },
					{ description: "Component", name: "COMP", type: "class" },
				],
			},
			success: true,
		})) as TouchDesignerClient["getClasses"],
		getNodeDetail: async (_params: unknown) => ({
			data: {
				id: 10,
				name: "webserverDAT",
				opType: "webServerDAT",
				path: "/project1/webserverDAT",
				properties: { active: true, port: 9981 },
			},
			success: true,
		}),
		getNodes: async (_params: unknown) => ({
			data: {
				nodes: [
					{
						id: 1,
						name: "geo1",
						opType: "geometry",
						path: "/project1/geo1",
						properties: {},
					},
					{
						id: 2,
						name: "text1",
						opType: "textTOP",
						path: "/project1/text1",
						properties: {},
					},
				],
				parentPath: "/project1",
			},
			success: true,
		}),
		getTdInfo: (async () => ({
			data: {
				osName: "test-os",
				osVersion: "0.0.0",
				server: "mock",
				version: "0.0.0",
			},
			success: true,
		})) as TouchDesignerClient["getTdInfo"],
		updateNode: async (_params: unknown) => ({
			data: { updated: ["a"] },
			success: true,
		}),
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
			detailLevel: "summary",
			parentPath: "/project1",
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
			detailLevel: "summary",
			nodePath: "/project1/webserverDAT",
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
			detailLevel: "summary",
			responseFormat: "markdown",
			script: "op('/project1').children",
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
			detailLevel: "summary",
			filter: "class",
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

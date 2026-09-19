import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { TOOL_NAMES } from "../../src/core/constants.js";
import type { ILogger } from "../../src/core/logger.js";
import { registerTools } from "../../src/features/tools/register.js";
import type { ExecNodeMethodBody } from "../../src/gen/endpoints/TouchDesignerAPI";
import type { TouchDesignerClient } from "../../src/tdClient/index.js";

type ToolHandler = (params?: Record<string, unknown>) => Promise<unknown>;

class MockMcpServer {
	public tools = new Map<string, ToolHandler>();

	registerTool(name: string, ...rest: unknown[]): void {
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
	sendLog: () => {},
};

function createMockTdClient(): TouchDesignerClient {
	const execNodeMethod: TouchDesignerClient["execNodeMethod"] = async <
		DATA extends NonNullable<{ result: unknown }>,
	>(
		_params: ExecNodeMethodBody,
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
		getAdditionalToolResultContents: () => null,
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
		getModuleHelp: (async (_params: unknown) => ({
			data: {
				helpText: `Help on module noiseCHOP:

NAME
    noiseCHOP

DESCRIPTION
    Generates procedural noise for CHOP channels.

METHODS
    cook(frame)

DATA DESCRIPTORS
    sampleRate`,
				moduleName: "noiseCHOP",
			},
			success: true,
		})) as TouchDesignerClient["getModuleHelp"],
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
		getNodeErrors: async (_params: unknown) => ({
			data: {
				errorCount: 1,
				errors: [
					{
						message: "Mock error detected",
						nodeName: "mockNode",
						nodePath: "/project1/mockNode",
						opType: "textTOP",
					},
				],
				hasErrors: true,
				nodeName: "mockNode",
				nodePath: "/project1/mockNode",
				opType: "textTOP",
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
		server as unknown as import("@modelcontextprotocol/server").McpServer,
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

	it("returns formatted error details for GET_TD_NODE_ERRORS", async () => {
		const handler = server.getTool(TOOL_NAMES.GET_TD_NODE_ERRORS);
		const result = (await handler({
			detailLevel: "summary",
			nodePath: "/project1/mockNode",
			responseFormat: "markdown",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("mockNode");
		expect(text).toContain("Mock error detected");
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

	it("renders captured stdout and stderr for EXECUTE_PYTHON_SCRIPT", async () => {
		const scriptServer = new MockMcpServer();
		const scriptClient = createMockTdClient();
		// Real WebServer responses carry captured output under the keys
		// "stdout" / "stderr" (see exec.yml) — assert the handler → formatter
		// path renders both sections from those exact keys.
		scriptClient.execPythonScript = (async (_params: unknown) => ({
			data: {
				result: "done",
				stderr: "oops stderr",
				stdout: "hello stdout",
			},
			success: true,
		})) as TouchDesignerClient["execPythonScript"];

		registerTools(
			scriptServer as unknown as import("@modelcontextprotocol/server").McpServer,
			logger,
			scriptClient,
		);

		const handler = scriptServer.getTool(TOOL_NAMES.EXECUTE_PYTHON_SCRIPT);
		const result = (await handler({
			detailLevel: "summary",
			responseFormat: "markdown",
			script: "print('hello stdout')",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("Output:");
		expect(text).toContain("hello stdout");
		expect(text).toContain("Stderr:");
		expect(text).toContain("oops stderr");
	});

	it("returns an image content block for GET_TOP_IMAGE", async () => {
		const imageServer = new MockMcpServer();
		const imageClient = createMockTdClient();
		imageClient.execPythonScript = (async (_params: unknown) => ({
			data: { result: "ZmFrZS1qcGVnLWJ5dGVz" },
			success: true,
		})) as TouchDesignerClient["execPythonScript"];

		registerTools(
			imageServer as unknown as import("@modelcontextprotocol/server").McpServer,
			logger,
			imageClient,
		);

		const handler = imageServer.getTool(TOOL_NAMES.GET_TOP_IMAGE);
		const result = (await handler({
			maxSize: 256,
			nodePath: "/project1/top1",
		})) as {
			content?: Array<{
				type: string;
				data?: string;
				mimeType?: string;
				text?: string;
			}>;
		};

		const image = result.content?.find((c) => c.type === "image");
		expect(image?.data).toBe("ZmFrZS1qcGVnLWJ5dGVz");
		expect(image?.mimeType).toBe("image/jpeg");
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("/project1/top1");
	});

	it("returns an error response when GET_TOP_IMAGE targets a non-existent node", async () => {
		const failingServer = new MockMcpServer();
		const failingClient = createMockTdClient();
		failingClient.execPythonScript = (async (_params: unknown) => ({
			error: new Error("Node not found at path: /project1/missing"),
			success: false,
		})) as TouchDesignerClient["execPythonScript"];

		registerTools(
			failingServer as unknown as import("@modelcontextprotocol/server").McpServer,
			logger,
			failingClient,
		);

		const handler = failingServer.getTool(TOOL_NAMES.GET_TOP_IMAGE);
		const result = (await handler({ nodePath: "/project1/missing" })) as {
			content?: Array<{ type: string; text?: string }>;
			isError?: boolean;
		};

		expect(result.isError).toBe(true);
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("Node not found at path: /project1/missing");
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

	it("returns formatted module help preview for GET_TD_MODULE_HELP", async () => {
		const handler = server.getTool(TOOL_NAMES.GET_TD_MODULE_HELP);
		const result = (await handler({
			detailLevel: "summary",
			moduleName: "noiseCHOP",
			responseFormat: "markdown",
		})) as {
			content?: Array<{ type: string; text?: string }>;
		};

		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("✓ Help information for noiseCHOP");
		expect(text).toContain("Sections:");
		expect(text).toContain("METHODS");
	});

	it("returns an error response when GET_TD_MODULE_HELP fails", async () => {
		const failingServer = new MockMcpServer();
		const failingClient = createMockTdClient();
		failingClient.getModuleHelp = (async () => ({
			error: new Error("Module missing"),
			success: false,
		})) as TouchDesignerClient["getModuleHelp"];

		registerTools(
			failingServer as unknown as import("@modelcontextprotocol/server").McpServer,
			logger,
			failingClient,
		);

		const handler = failingServer.getTool(TOOL_NAMES.GET_TD_MODULE_HELP);
		const result = (await handler({
			moduleName: "missing",
		})) as {
			content?: Array<{ type: string; text?: string }>;
			isError?: boolean;
		};

		expect(result.isError).toBe(true);
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("Module missing");
	});
});

/**
 * `limit` over the registered tools, in the formats that render `structured`.
 *
 * The unit suite pins the formatters; this pins the path an agent actually
 * takes — schema, handler, presenter — because `limit` reaching the formatter
 * at all is a property of `toolDefinitions.ts`, and `get_td_classes` supplies
 * its own default there.
 */
describe("limit at the MCP boundary", () => {
	/** Register the tools over a client with one method replaced. */
	function serverWith(overrides: Partial<TouchDesignerClient>) {
		const client = createMockTdClient();
		Object.assign(client, overrides);
		const server = new MockMcpServer();
		registerTools(
			server as unknown as import("@modelcontextprotocol/server").McpServer,
			logger,
			client,
		);
		return server;
	}

	async function callTool(
		server: MockMcpServer,
		name: string,
		params: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const result = (await server.getTool(name)(params)) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		return (
			params.responseFormat === "json" ? JSON.parse(text) : parseYaml(text)
		) as Record<string, unknown>;
	}

	const manyErrors = {
		errorCount: 9,
		errors: Array.from({ length: 9 }, (_, i) => ({
			level: "error" as const,
			message: `failure ${i}`,
			nodeName: `bad${i}`,
			nodePath: `/project1/probe/bad${i}`,
			opType: "textTOP",
		})),
		hasErrors: true,
		hasWarnings: false,
		nodeName: "probe",
		nodePath: "/project1/probe",
		opType: "baseCOMP",
		warningCount: 0,
		warnings: [],
	};

	const manyClasses = Array.from({ length: 120 }, (_, i) => ({
		description: `class ${i}`,
		name: `Class${i}`,
		type: "class" as const,
	}));

	const classListServer = () =>
		serverWith({
			getClasses: (async () => ({
				data: { classes: manyClasses },
				success: true,
			})) as TouchDesignerClient["getClasses"],
		});

	const errorReportServer = () =>
		serverWith({
			getNodeErrors: (async () => ({
				data: manyErrors,
				success: true,
			})) as TouchDesignerClient["getNodeErrors"],
		});

	it("caps get_td_node_errors in json and says how much it left out", async () => {
		const payload = await callTool(
			errorReportServer(),
			TOOL_NAMES.GET_TD_NODE_ERRORS,
			{
				limit: 3,
				nodePath: "/project1/probe",
				responseFormat: "json",
			},
		);

		expect(payload.errors).toHaveLength(3);
		expect(payload.truncated).toBe(true);
		expect(payload.truncation).toMatchObject({
			collections: { errors: { omitted: 6, returned: 3, total: 9 } },
			limit: 3,
		});
		// The count stays the server's, so the cap is visible as a gap between
		// what was reported and what came back.
		expect(payload.errorCount).toBe(9);
	});

	it("leaves get_td_node_errors uncapped at detailLevel detailed", async () => {
		const payload = await callTool(
			errorReportServer(),
			TOOL_NAMES.GET_TD_NODE_ERRORS,
			{
				detailLevel: "detailed",
				limit: 3,
				nodePath: "/project1/probe",
				responseFormat: "yaml",
			},
		);

		expect(payload.errors).toHaveLength(9);
		expect(payload).not.toHaveProperty("truncation");
	});

	it("caps get_td_nodes in yaml and says how much it left out", async () => {
		const server = serverWith({
			getNodes: (async () => ({
				data: {
					nodes: Array.from({ length: 8 }, (_, i) => ({
						id: i,
						name: `node${i}`,
						opType: "textTOP",
						path: `/project1/node${i}`,
						properties: {},
					})),
					parentPath: "/project1",
				},
				success: true,
			})) as TouchDesignerClient["getNodes"],
		});

		const payload = await callTool(server, TOOL_NAMES.GET_TD_NODES, {
			limit: 2,
			parentPath: "/project1",
			responseFormat: "yaml",
		});

		const listed = (payload.groups as Array<{ nodes: unknown[] }>).flatMap(
			(group) => group.nodes,
		);
		expect(listed).toHaveLength(2);
		expect(payload.truncated).toBe(true);
		expect(payload.truncation).toMatchObject({
			collections: { nodes: { omitted: 6, returned: 2, total: 8 } },
			limit: 2,
		});
	});

	it("applies the get_td_classes default cap of 50 with no limit from the caller", async () => {
		// toolDefinitions passes `params.limit ?? 50`, so this tool always has
		// a cap. Until this fix that cap reached nothing, and a TouchDesigner
		// build with a thousand classes returned all thousand in every format.
		const payload = await callTool(
			classListServer(),
			TOOL_NAMES.GET_TD_CLASSES,
			{ responseFormat: "json" },
		);

		expect(payload.classes).toHaveLength(50);
		expect(payload.classCount).toBe(120);
		expect(payload.truncation).toMatchObject({
			collections: { classes: { omitted: 70, returned: 50, total: 120 } },
			limit: 50,
		});
	});

	it("says in the markdown class list that it stopped at the cap", async () => {
		const result = (await classListServer().getTool(TOOL_NAMES.GET_TD_CLASSES)({
			responseFormat: "markdown",
		})) as { content?: Array<{ type: string; text?: string }> };
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";

		expect(
			text.split("\n").filter((line) => line.startsWith("- `Class")),
		).toHaveLength(50);
		expect(text).toContain("70 more class(es) omitted");
	});
});

import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../../src/core/constants.js";
import type { ILogger } from "../../src/core/logger.js";
import { registerTools } from "../../src/features/tools/register.js";
import type { ExecNodeMethodBody } from "../../src/gen/endpoints/TouchDesignerAPI";
import type { TouchDesignerClient } from "../../src/tdClient/index.js";

type ToolHandler = (params?: Record<string, unknown>) => Promise<unknown>;
type ResourceReader = () => Promise<unknown>;

class MockMcpServer {
	public tools = new Map<string, ToolHandler>();
	// UI resources keyed by uri; populated via registerResource (ext-apps path).
	public resources = new Map<string, ResourceReader>();
	// _meta captured per tool so tests can assert the ui/resourceUri wiring.
	public toolMeta = new Map<string, Record<string, unknown>>();

	tool(name: string, ...rest: unknown[]): void {
		const args = [...rest];
		const handler = args.pop();
		if (typeof handler === "function") {
			this.tools.set(name, handler as ToolHandler);
		}
	}

	// ext-apps' registerAppTool calls server.registerTool(name, config, handler).
	registerTool(
		name: string,
		config: { _meta?: Record<string, unknown> },
		handler: ToolHandler,
	): void {
		this.tools.set(name, handler);
		if (config?._meta) this.toolMeta.set(name, config._meta);
	}

	// ext-apps' registerAppResource calls
	// server.registerResource(name, uri, meta, reader).
	registerResource(
		_name: string,
		uri: string,
		_meta: unknown,
		reader: ResourceReader,
	): void {
		this.resources.set(uri, reader);
	}

	getTool(name: string): ToolHandler {
		const tool = this.tools.get(name);
		if (!tool) throw new Error(`Tool ${name} not registered`);
		return tool;
	}

	getResource(uri: string): ResourceReader {
		const reader = this.resources.get(uri);
		if (!reader) throw new Error(`Resource ${uri} not registered`);
		return reader;
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
		getNodeParSpecs: async (_params: unknown) => ({
			data: {
				nodeName: "text1",
				nodePath: "/project1/text1",
				opType: "textTOP",
				pars: [
					{
						clampMax: false,
						clampMin: false,
						default: 0,
						label: "Translate X",
						max: 10,
						min: -10,
						name: "tx",
						page: "Transform",
						style: "Float",
						value: 1.5,
					},
					{
						label: "Active",
						name: "active",
						page: "Common",
						style: "Toggle",
						value: true,
					},
					{
						label: "Extension",
						menuLabels: ["PNG", "JPEG"],
						menuNames: ["png", "jpg"],
						name: "fileformat",
						page: "Common",
						style: "Menu",
						value: "png",
					},
					{
						label: "Reset",
						name: "reset",
						page: "Common",
						style: "Pulse",
						value: 0,
					},
					{
						label: "Text",
						name: "text",
						page: "Text",
						style: "Str",
						value: "hello",
					},
				],
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

	it("returns node browser structuredContent for UI_TD_NODE_BROWSER", async () => {
		const handler = server.getTool(TOOL_NAMES.UI_TD_NODE_BROWSER);
		const result = (await handler({ parentPath: "/project1" })) as {
			content?: Array<{ type: string; text?: string }>;
			structuredContent?: {
				parentPath: string;
				nodes: Array<{ name: string; path: string; opType: string }>;
			};
		};

		// Host-fallback text summary must still be present.
		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("under /project1");

		// Widget payload: projected node records.
		expect(result.structuredContent?.parentPath).toBe("/project1");
		expect(result.structuredContent?.nodes.map((n) => n.name)).toEqual([
			"geo1",
			"text1",
		]);
	});

	it("wires UI_TD_NODE_BROWSER to its ui:// resource via _meta", () => {
		const meta = server.toolMeta.get(TOOL_NAMES.UI_TD_NODE_BROWSER) ?? {};
		// ext-apps stores the resource uri under the ui/resourceUri meta key.
		expect(Object.values(meta)).toContain("ui://touchdesigner/node-browser");
		// And the resource itself must be registered for the host to fetch.
		expect(() =>
			server.getResource("ui://touchdesigner/node-browser"),
		).not.toThrow();
	});

	it("returns full par specs structuredContent for UI_TD_PARAM_EDITOR", async () => {
		const handler = server.getTool(TOOL_NAMES.UI_TD_PARAM_EDITOR);
		const result = (await handler({ nodePath: "/project1/text1" })) as {
			content?: Array<{ type: string; text?: string }>;
			structuredContent?: {
				nodePath: string;
				pars: Array<{ name: string; style: string }>;
			};
		};

		const text = result.content?.find((c) => c.type === "text")?.text ?? "";
		expect(text).toContain("/project1/text1");
		expect(text).toContain("5 parameter(s)");

		const styles = (result.structuredContent?.pars ?? []).map((p) => p.style);
		// All TD parameter styles the editor must render are forwarded verbatim.
		expect(styles).toEqual(["Float", "Toggle", "Menu", "Pulse", "Str"]);
		const tx = result.structuredContent?.pars.find((p) => p.name === "tx");
		expect(tx).toMatchObject({ style: "Float", name: "tx" });
	});

	it("wires UI_TD_PARAM_EDITOR to its ui:// resource via _meta", () => {
		const meta = server.toolMeta.get(TOOL_NAMES.UI_TD_PARAM_EDITOR) ?? {};
		expect(Object.values(meta)).toContain("ui://touchdesigner/param-editor");
		expect(() =>
			server.getResource("ui://touchdesigner/param-editor"),
		).not.toThrow();
	});

	it("serves self-contained HTML from the param-editor ui:// resource", async () => {
		const reader = server.getResource("ui://touchdesigner/param-editor");
		const result = (await reader()) as {
			contents?: Array<{ uri: string; mimeType: string; text: string }>;
		};
		const doc = result.contents?.[0];
		expect(doc?.mimeType).toBe("text/html;profile=mcp-app");
		expect(doc?.uri).toBe("ui://touchdesigner/param-editor");
		// The inlined build must carry the editor shell, not an empty page.
		expect(doc?.text).toContain("<!doctype html>");
		expect(doc?.text.length ?? 0).toBeGreaterThan(1000);
	});

	it("returns an error response when GET_TD_MODULE_HELP fails", async () => {
		const failingServer = new MockMcpServer();
		const failingClient = createMockTdClient();
		failingClient.getModuleHelp = (async () => ({
			error: new Error("Module missing"),
			success: false,
		})) as TouchDesignerClient["getModuleHelp"];

		registerTools(
			failingServer as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
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

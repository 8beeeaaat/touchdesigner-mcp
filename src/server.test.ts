import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TouchDesignerServer } from "./server.js";

vi.mock("./schemas/common/index.js", () => ({
	NodeSchemasByFamily: {
		TOP: {
			null: {},
		},
		COMP: {
			null: {},
		},
	},
	CreateTDNodeParams: {},
	DeleteTDNodeParams: {},
	GetNodeTypeDefaultParametersQueryParams: {},
	GetTDNodePropertiesParams: {},
	UpdateTDNodePropertiesParams: {},
}));

vi.mock("./schemas/tops/index.js", () => ({
	createTOPSchema: vi.fn(),
}));

vi.mock("./schemas/comp/utils.js", () => ({
	createCOMPSchema: vi.fn(),
}));

vi.mock("./prompts/index.js", () => ({
	PROMPTS: {
		CheckNode: { name: "check-node" },
	},
	getPrompt: vi.fn(),
}));

vi.mock("./tdClient/index.js", () => ({
	createTouchDesignerClient: vi.fn().mockReturnValue({
		createNode: vi
			.fn()
			.mockResolvedValue({ success: true, data: { node: "test" } }),
		deleteNode: vi
			.fn()
			.mockResolvedValue({ success: true, data: { result: "deleted" } }),
		getServerInfo: vi
			.fn()
			.mockResolvedValue({ success: true, data: { server: "info" } }),
		getProjectNodes: vi
			.fn()
			.mockResolvedValue({ success: true, data: { nodes: [] } }),
		getNodeTypeDefaultParameters: vi
			.fn()
			.mockResolvedValue({ success: true, data: { parameters: {} } }),
		getNodeProperty: vi
			.fn()
			.mockResolvedValue({ success: true, data: { properties: {} } }),
		updateNode: vi
			.fn()
			.mockResolvedValue({ success: true, data: { result: "updated" } }),
	}),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
	McpServer: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		tool: vi.fn(),
		server: {
			setRequestHandler: vi.fn(),
		},
	})),
}));

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
	ListPromptsRequestSchema: {},
	GetPromptRequestSchema: {},
	ListResourcesRequestSchema: {},
	ReadResourceRequestSchema: {},
}));

vi.mock("./util.js", () => ({
	Logger: vi.fn().mockImplementation(() => ({
		log: vi.fn(),
		error: vi.fn(),
	})),
}));

interface MockTransport extends Transport {
	send: ReturnType<typeof vi.fn>;
	onMessage: ReturnType<typeof vi.fn>;
	start: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
}

class TestTouchDesignerServer extends TouchDesignerServer {
	public testValidateToolParams(family: string, nodeType: string) {
		return this.validateToolParams(family, nodeType);
	}

	public async testCheckTDConnection() {
		return this.checkTDConnection();
	}
}

describe("TouchDesignerServer", () => {
	describe("validateToolParams", () => {
		let server: TestTouchDesignerServer;

		beforeEach(() => {
			server = new TestTouchDesignerServer();
		});

		it("should return error result for invalid family", () => {
			const result = server.testValidateToolParams(
				"INVALID_FAMILY",
				"someType",
			);
			expect(result.success).toBe(false);
			if (result.success) {
				throw new Error("Expected failure result");
			}
			expect(result.error).toBeInstanceOf(Error);
			expect(result.error.message).toContain("No schemas found for family");
		});

		it("should return error result for invalid node type", () => {
			const result = server.testValidateToolParams("TOP", "invalidType");
			expect(result.success).toBe(false);
			if (result.success) {
				throw new Error("Expected failure result");
			}
			expect(result.error).toBeInstanceOf(Error);
			expect(result.error.message).toContain("No schema found for nodeType");
		});

		it("should return success result for valid family and node type", () => {
			const result = server.testValidateToolParams("TOP", "null");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(true);
			} else {
				throw new Error("Expected success result");
			}
		});
	});

	describe("Connection Management", () => {
		let server: TouchDesignerServer;
		let mockTransport: MockTransport;

		beforeEach(() => {
			vi.clearAllMocks();
			server = new TouchDesignerServer();
			mockTransport = {
				send: vi.fn(),
				onMessage: vi.fn(),
				start: vi.fn(),
				close: vi.fn(),
			};
		});

		it("should properly manage connection state when connect method is called", async () => {
			const result = await server.connect(mockTransport);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(server.isConnectedToMCP()).toBe(true);
			} else {
				throw new Error("Expected success result");
			}
		});

		it("should return error and clear connection state when connection fails", async () => {
			(server.server.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				new Error("Connection error"),
			);

			const result = await server.connect(mockTransport);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeInstanceOf(Error);
				expect(result.error.message).toContain("Connection error");
				expect(server.isConnectedToMCP()).toBe(false);
			} else {
				throw new Error("Expected failure result");
			}
		});

		it("should early return when already connected", async () => {
			server.transport = mockTransport;
			const result = await server.connect(mockTransport);
			expect(result.success).toBe(true);
			expect(server.server.connect).not.toHaveBeenCalled();
		});
	});
});

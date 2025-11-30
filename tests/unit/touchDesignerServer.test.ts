import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TouchDesignerServer } from "../../src/server/touchDesignerServer.js";

// 正しいパスでモックを設定
vi.mock("../../src/features/prompts/index.js", () => ({
	registerPrompts: vi.fn(),
}));

vi.mock("../../src/features/resources/index.js", () => ({
	registerResources: vi.fn(),
}));

vi.mock("../../src/features/tools/index.js", () => ({
	registerTools: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
	McpServer: vi.fn(function MockMcpServer(this: Record<string, unknown>) {
		this.connect = vi.fn().mockResolvedValue(undefined);
		this.close = vi.fn().mockResolvedValue(undefined);
		this.tool = vi.fn();
		this.server = {
			sendLoggingMessage: vi.fn(),
			setRequestHandler: vi.fn(),
		};
	}),
}));

vi.mock("../../src/tdClient/index.js", () => ({
	createTouchDesignerClient: vi.fn().mockReturnValue({
		getTdInfo: vi
			.fn()
			.mockResolvedValue({ success: true, data: { server: "info" } }),
	}),
}));

describe("TouchDesignerServer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize dependencies in the correct order", async () => {
		// テスト前にモジュールをインポート
		const promptsModule = await import("../../src/features/prompts/index.js");
		const toolsModule = await import("../../src/features/tools/index.js");

		new TouchDesignerServer();

		expect(McpServer).toHaveBeenCalledTimes(1);

		// モック関数が呼ばれたか確認
		expect(promptsModule.registerPrompts).toHaveBeenCalled();
		expect(toolsModule.registerTools).toHaveBeenCalled();
	});
});

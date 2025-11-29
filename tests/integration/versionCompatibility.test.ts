import { beforeEach, describe, expect, test, vi } from "vitest";
import { MIN_SUPPORTED_SERVER_VERSION } from "../../src/core/versionCheck.js";
import { TouchDesignerServer } from "../../src/server/touchDesignerServer.js";

const loggingMessages: Array<{ level: string; data: unknown }> = [];
const mockGetTdInfo = vi.fn();

vi.mock("../../src/features/prompts/index.js", () => ({
	registerPrompts: vi.fn(),
}));

vi.mock("../../src/features/resources/index.js", () => ({
	registerResources: vi.fn(),
}));

vi.mock("../../src/features/tools/index.js", () => ({
	registerTools: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
	const MockMcpServer = vi
		.fn()
		.mockImplementation(function MockMcpServer(this: {
			connect: ReturnType<typeof vi.fn>;
			close: ReturnType<typeof vi.fn>;
			tool: ReturnType<typeof vi.fn>;
			server: {
				sendLoggingMessage: (entry: { level: string; data: unknown }) => void;
			};
		}) {
			this.connect = vi.fn();
			this.close = vi.fn();
			this.tool = vi.fn();
			this.server = {
				sendLoggingMessage: (entry: { level: string; data: unknown }) => {
					loggingMessages.push(entry);
				},
			};
		});

	return {
		McpServer: MockMcpServer,
	};
});

vi.mock("../../src/tdClient/index.js", () => ({
	createTouchDesignerClient: vi.fn(() => ({
		getTdInfo: mockGetTdInfo,
	})),
}));

async function waitForVersionCheck(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function getWarnings(): string[] {
	return loggingMessages
		.filter((entry) => entry.level === "warning")
		.map((entry) => String(entry.data));
}

describe("TouchDesignerServer version compatibility (integration)", () => {
	beforeEach(() => {
		mockGetTdInfo.mockReset();
		loggingMessages.length = 0;
	});

	test("logs warning when server API version is below the minimum", async () => {
		mockGetTdInfo.mockResolvedValueOnce({
			data: { apiVersion: "1.0.0" },
			success: true,
		});

		new TouchDesignerServer();
		await waitForVersionCheck();

		const warnings = getWarnings();
		expect(mockGetTdInfo).toHaveBeenCalled();
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("below minimum");
		expect(warnings[0]).toContain(MIN_SUPPORTED_SERVER_VERSION);
	});

	test("does not log warning when server API version meets requirements", async () => {
		mockGetTdInfo.mockResolvedValueOnce({
			data: { apiVersion: "1.5.2" },
			success: true,
		});

		new TouchDesignerServer();
		await waitForVersionCheck();

		const warnings = getWarnings();
		expect(mockGetTdInfo).toHaveBeenCalled();
		expect(warnings).toHaveLength(0);
	});

	test("logs warning when server API version is missing", async () => {
		mockGetTdInfo.mockResolvedValueOnce({
			data: {},
			success: true,
		});

		new TouchDesignerServer();
		await waitForVersionCheck();

		const warnings = getWarnings();
		expect(mockGetTdInfo).toHaveBeenCalled();
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("unknown");
		expect(warnings[0]).toContain(MIN_SUPPORTED_SERVER_VERSION);
	});
});

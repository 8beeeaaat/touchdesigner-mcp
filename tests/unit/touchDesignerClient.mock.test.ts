import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ILogger } from "../../src/core/logger";
import * as touchDesignerAPI from "../../src/gen/endpoints/TouchDesignerAPI";

import {
	type ITouchDesignerApi,
	TouchDesignerClient,
} from "../../src/tdClient/touchDesignerClient";

vi.mock("../../src/gen/endpoints/TouchDesignerAPI", async () => {
	return {
		createNode: vi.fn(),
		deleteNode: vi.fn(),
		execNodeMethod: vi.fn(),
		execPythonScript: vi.fn(),
		getModuleHelp: vi.fn(),
		getNodeDetail: vi.fn(),
		getNodeErrors: vi.fn(),
		getNodes: vi.fn(),
		getTdInfo: vi.fn(),
		getTdPythonClassDetails: vi.fn(),
		getTdPythonClasses: vi.fn(),
		updateNode: vi.fn(),
	};
});

const nullLogger: ILogger = {
	sendLog: () => {},
};

describe("TouchDesignerClient with mocks", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
			data: {
				mcpApiVersion: "1.2.0",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		});
	});

	test("getTdInfo should handle successful response", async () => {
		const mockResponse = {
			data: {
				mcpApiVersion: "1.2.0",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		};

		vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue(mockResponse);

		const client = new TouchDesignerClient({ logger: nullLogger });
		const result = await client.getTdInfo();

		expect(result).toBeDefined();
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBeDefined();
			expect(result.data.server).toBe("TouchDesigner");
			expect(result.data.version).toBe("2023.11050");
			expect(result.data.osName).toBe("macOS");
			expect(result.data.osVersion).toBe("12.6.1");
		}
	});

	test("getTdInfo should handle error response", async () => {
		const compatibilityResponse = {
			data: {
				mcpApiVersion: "1.2.0",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		};
		const errorResponse = {
			data: null,
			error: "Failed to connect to server",
			success: false,
		};

		vi.mocked(touchDesignerAPI.getTdInfo)
			.mockResolvedValueOnce(compatibilityResponse)
			.mockResolvedValueOnce(errorResponse);

		const client = new TouchDesignerClient({ logger: nullLogger });
		const result = await client.getTdInfo();
		if (result.success) {
			throw new Error("Expected success to be false");
		}
		expect(result.success).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error.message).toBe("Failed to connect to server");
	});

	test("getTdInfo should handle missing data response", async () => {
		const compatibilityResponse = {
			data: {
				mcpApiVersion: "1.2.0",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		};
		const mockResponse = {
			data: null,
			error: null,
			success: true,
		};

		vi.mocked(touchDesignerAPI.getTdInfo)
			.mockResolvedValueOnce(compatibilityResponse)
			.mockResolvedValueOnce(mockResponse);

		const client = new TouchDesignerClient({ logger: nullLogger });
		const result = await client.getTdInfo();
		if (result.success) {
			throw new Error("Expected success to be false");
		}
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error.message).toBe("No data received");
	});

	test("getTdInfo should fail when API version mismatches server version", async () => {
		const mockLogger: ILogger = {
			sendLog: vi.fn(),
		};

		const mismatchResponse = {
			data: {
				mcpApiVersion: "0.9.0",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		};

		vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue(mismatchResponse);

		const client = new TouchDesignerClient({ logger: mockLogger });

		await expect(client.getTdInfo()).rejects.toThrow(
			"Version mismatch detected",
		);
		expect(mockLogger.sendLog).toHaveBeenCalledWith(
			expect.objectContaining({
				level: "error",
				logger: "TouchDesignerClient",
			}),
		);
	});

	test("createNode should handle successful creation", async () => {
		const mockResponse = {
			data: {
				result: {
					id: 123,
					name: "testNode",
					opType: "nullCOMP",
					path: "/project1/testNode",
					properties: {},
				},
			},
			error: null,
			success: true,
		};

		vi.mocked(touchDesignerAPI.createNode).mockResolvedValue(mockResponse);

		const client = new TouchDesignerClient({ logger: nullLogger });
		const result = await client.createNode({
			nodeName: "testNode",
			nodeType: "nullCOMP",
			parentPath: "/project1",
		});
		if (!result.success) {
			throw new Error("Expected success to be true");
		}
		expect(result).toBeDefined();
		expect(result.success).toBe(true);
		expect(result.data.result?.name).toBe("testNode");
	});

	test("execPythonScript should handle successful execution", async () => {
		const mockResponse = {
			data: {
				result: { value: "Script executed successfully" }, // Adjusted structure
			},
			error: null,
			success: true,
		};

		vi.mocked(touchDesignerAPI.execPythonScript).mockResolvedValue(
			mockResponse as unknown as touchDesignerAPI.ExecPythonScript200Response,
		);

		const client = new TouchDesignerClient({ logger: nullLogger });
		const result = await client.execPythonScript<{
			result: { value: string };
		}>({
			script: 'print("Hello")',
		});
		if (!result.success) {
			throw new Error("Expected success to be true");
		}
		expect(result).toBeDefined();
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data?.result?.value).toBe("Script executed successfully");
	});

	test("TouchDesignerClient should accept custom logger", async () => {
		const mockLogger: ILogger = {
			sendLog: vi.fn(),
		};

		const mockResponse = {
			data: {
				mcpApiVersion: "1.2.0",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		};

		vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue(mockResponse);

		const client = new TouchDesignerClient({ logger: mockLogger });
		const result = await client.getTdInfo();

		expect(result.success).toBe(true);
		expect(mockLogger.sendLog).toHaveBeenCalledWith(
			expect.objectContaining({ level: "debug" }),
		);
	});

	test("TouchDesignerClient should accept custom httpClient", async () => {
		const mockHttpClient = {
			getTdInfo: vi.fn().mockResolvedValue({
				data: {
					mcpApiVersion: "1.2.0",
					server: "CustomServer",
					status: "CustomStatus",
					version: "CustomVersion",
				},
				success: true,
			}),
		};

		const client = new TouchDesignerClient({
			httpClient: mockHttpClient as unknown as ITouchDesignerApi,
			logger: nullLogger,
		});

		const result = await client.getTdInfo();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data?.server).toBe("CustomServer");
		}
		expect(mockHttpClient.getTdInfo).toHaveBeenCalled();
	});
});

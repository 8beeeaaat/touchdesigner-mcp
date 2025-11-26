import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ILogger } from "../../src/core/logger";
import * as touchDesignerAPI from "../../src/gen/endpoints/TouchDesignerAPI";

import {
	type ITouchDesignerApi,
	TouchDesignerClient,
} from "../../src/tdClient/touchDesignerClient";

vi.mock("../../src/gen/endpoints/TouchDesignerAPI", async () => {
	return {
		checkNodeErrors: vi.fn(),
		getTdInfo: vi.fn(),
		getTdPythonClasses: vi.fn(),
		getTdPythonClassDetails: vi.fn(),
		execNodeMethod: vi.fn(),
		execPythonScript: vi.fn(),
		createNode: vi.fn(),
		updateNode: vi.fn(),
		deleteNode: vi.fn(),
		getNodes: vi.fn(),
		getNodeDetail: vi.fn(),
	};
});

const nullLogger: ILogger = {
	debug: () => {},
	log: () => {},
	warn: () => {},
	error: () => {},
};

describe("TouchDesignerClient with mocks", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test("getTdInfo should handle successful response", async () => {
		const mockResponse = {
			success: true,
			data: {
				server: "TouchDesigner",
				version: "2023.11050",
				osName: "macOS",
				osVersion: "12.6.1",
			},
			error: null,
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
		const mockResponse = {
			success: false,
			data: null,
			error: "Failed to connect to server",
		};

		vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue(mockResponse);

		const client = new TouchDesignerClient({ logger: nullLogger });
		const result = await client.getTdInfo();
		if (result.success) {
			throw new Error("Expected success to be false");
		}
		expect(result.success).toBe(false);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error.message).toBe("Failed to connect to server");
	});

	test("createNode should handle successful creation", async () => {
		const mockResponse = {
			success: true,
			data: {
				result: {
					id: 123,
					name: "testNode",
					path: "/project1/testNode",
					opType: "nullCOMP",
					properties: {},
				},
			},
			error: null,
		};

		vi.mocked(touchDesignerAPI.createNode).mockResolvedValue(mockResponse);

		const client = new TouchDesignerClient({ logger: nullLogger });
		const result = await client.createNode({
			parentPath: "/project1",
			nodeType: "nullCOMP",
			nodeName: "testNode",
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
			success: true,
			data: {
				result: { value: "Script executed successfully" }, // Adjusted structure
			},
			error: null,
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
			debug: vi.fn(),
			log: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		const mockResponse = {
			success: true,
			data: {
				server: "TouchDesigner",
				version: "2023.11050",
				osName: "macOS",
				osVersion: "12.6.1",
			},
			error: null,
		};

		vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue(mockResponse);

		const client = new TouchDesignerClient({ logger: mockLogger });
		const result = await client.getTdInfo();

		expect(result.success).toBe(true);
		expect(mockLogger.debug).toHaveBeenCalled();
	});

	test("TouchDesignerClient should accept custom httpClient", async () => {
		const mockHttpClient = {
			getTdInfo: vi.fn().mockResolvedValue({
				success: true,
				data: {
					server: "CustomServer",
					version: "CustomVersion",
					status: "CustomStatus",
				},
			}),
		};

		const client = new TouchDesignerClient({
			logger: nullLogger,
			httpClient: mockHttpClient as unknown as ITouchDesignerApi,
		});

		const result = await client.getTdInfo();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data?.server).toBe("CustomServer");
		}
		expect(mockHttpClient.getTdInfo).toHaveBeenCalled();
	});
});

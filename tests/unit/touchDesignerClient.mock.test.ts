import { AxiosError } from "axios";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ILogger } from "../../src/core/logger";
import * as version from "../../src/core/version";
import * as touchDesignerAPI from "../../src/gen/endpoints/TouchDesignerAPI";

import {
	ERROR_CACHE_TTL_MS,
	type ITouchDesignerApi,
	SUCCESS_CACHE_TTL_MS,
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

vi.mock("../../src/core/version", async () => {
	return {
		getMcpServerVersion: vi.fn(() => "1.3.1"),
		getMinCompatibleApiVersion: vi.fn(() => "1.3.0"),
		MCP_SERVER_VERSION: "1.3.1",
		MIN_COMPATIBLE_API_VERSION: "1.3.0",
	};
});

const nullLogger: ILogger = {
	sendLog: () => {},
};

const compatibilityResponse = {
	data: {
		mcpApiVersion: "1.3.1",
		osName: "macOS",
		osVersion: "12.6.1",
		server: "TouchDesigner",
		version: "2023.11050",
	},
	error: null,
	success: true,
};

describe("TouchDesignerClient with mocks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset version mocks to default values
		// Individual tests can override these as needed using vi.mocked().mockReturnValue()
		vi.mocked(version.getMcpServerVersion).mockReturnValue("1.3.1");
		vi.mocked(version.getMinCompatibleApiVersion).mockReturnValue("1.3.0");

		vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue(
			compatibilityResponse,
		);
	});

	test("getTdInfo should handle successful response", async () => {
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

	test("should re-check compatibility when getTdInfo is called after cache warmup", async () => {
		const legacyResponse = {
			data: {
				mcpApiVersion: "",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		};

		const getTdInfoMock = vi.mocked(touchDesignerAPI.getTdInfo);
		getTdInfoMock.mockReset();

		try {
			getTdInfoMock
				.mockResolvedValueOnce(compatibilityResponse) // Initial compatibility check
				.mockResolvedValueOnce(compatibilityResponse) // First getTdInfo call
				.mockResolvedValueOnce(legacyResponse) // Revalidation triggered by second getTdInfo
				.mockResolvedValueOnce(legacyResponse); // Actual second call should never execute after revalidation fails

			const client = new TouchDesignerClient({ logger: nullLogger });
			await client.getTdInfo();

			await expect(client.getTdInfo()).rejects.toThrow(
				"Version Information Missing",
			);
		} finally {
			getTdInfoMock.mockReset();
			getTdInfoMock.mockResolvedValue(compatibilityResponse);
		}
	});

	describe("Semantic Version Compatibility", () => {
		test("should accept same MAJOR with different PATCH", async () => {
			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "1.3.5",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: nullLogger });
			const result = await client.getTdInfo();

			expect(result.success).toBe(true);
		});

		test("should expose compatibility notice for warnings", async () => {
			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "1.3.5",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: nullLogger });
			const result = await client.getTdInfo();

			expect(result.success).toBe(true);
			expect(client.getCompatibilityNotice()).not.toBeNull();
			expect(client.getCompatibilityNotice()?.message).toContain(
				"Patch Version Mismatch",
			);

			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue(
				compatibilityResponse,
			);
			await client.getTdInfo();
			expect(client.getCompatibilityNotice()).toBeNull();
		});

		test("should reject different MAJOR version", async () => {
			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "2.0.0",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: nullLogger });
			await expect(client.getTdInfo()).rejects.toThrow("MAJOR version");
		});

		test("should reject version below minimum compatible version", async () => {
			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "1.2.99",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: nullLogger });
			await expect(client.getTdInfo()).rejects.toThrow(
				"TouchDesigner API Server Update Required",
			);
		});

		test("should reject legacy TOX files without mcpApiVersion", async () => {
			const mockLogger: ILogger = {
				sendLog: vi.fn(),
			};

			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					// Legacy TOX - empty mcpApiVersion to simulate v1.2.x or earlier
					mcpApiVersion: "",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "099.2025.31550",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: mockLogger });
			await expect(client.getTdInfo()).rejects.toThrow(
				"Version Information Missing",
			);

			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						message: expect.stringContaining("Version information is required"),
					}),
					level: "error",
					logger: "TouchDesignerClient",
				}),
			);
		});

		test("should warn when MCP is newer MINOR", async () => {
			const mockLogger: ILogger = {
				sendLog: vi.fn(),
			};

			vi.mocked(version.getMcpServerVersion).mockReturnValue("1.4.0");
			vi.mocked(version).MCP_SERVER_VERSION = "1.4.0";

			const client = new TouchDesignerClient({ logger: mockLogger });
			const result = await client.getTdInfo();

			expect(result.success).toBe(true);
			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					level: "warning",
					logger: "TouchDesignerClient",
				}),
			);
		});

		test("should allow API server with newer MINOR", async () => {
			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "1.5.0",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: nullLogger });
			const result = await client.getTdInfo();

			expect(result.success).toBe(true);
		});

		test("should accept same version with v-prefix", async () => {
			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "v1.3.1",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: nullLogger });
			const result = await client.getTdInfo();

			expect(result.success).toBe(true);
		});

		test("should reject invalid semver version format", async () => {
			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "Invalid semver version",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: nullLogger });
			await expect(client.getTdInfo()).rejects.toThrow(
				"Invalid semver version",
			);
		});

		test("should log error with structured data for MAJOR mismatch", async () => {
			const mockLogger: ILogger = {
				sendLog: vi.fn(),
			};

			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "2.0.0",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: mockLogger });

			await expect(client.getTdInfo()).rejects.toThrow();

			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						apiVersion: "2.0.0",
						mcpVersion: expect.any(String),
						minRequired: expect.any(String),
					}),
					level: "error",
					logger: "TouchDesignerClient",
				}),
			);
		});

		test("should log error with structured data for BELOW_MIN_VERSION", async () => {
			const mockLogger: ILogger = {
				sendLog: vi.fn(),
			};

			vi.mocked(touchDesignerAPI.getTdInfo).mockResolvedValue({
				data: {
					mcpApiVersion: "1.2.9",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({ logger: mockLogger });

			await expect(client.getTdInfo()).rejects.toThrow(
				"TouchDesigner API Server Update Required",
			);

			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						apiVersion: "1.2.9",
						mcpVersion: expect.any(String),
						minRequired: expect.any(String),
					}),
					level: "error",
					logger: "TouchDesignerClient",
				}),
			);
		});
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
				mcpApiVersion: "1.3.1",
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
					mcpApiVersion: "1.3.1",
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

	test("should cache compatibility check and not call getTdInfo multiple times", async () => {
		const mockGetTdInfo = vi.fn().mockResolvedValue({
			data: {
				mcpApiVersion: "1.3.1",
				osName: "macOS",
				osVersion: "12.6.1",
				server: "TouchDesigner",
				version: "2023.11050",
			},
			error: null,
			success: true,
		});

		const mockCreateNode = vi.fn().mockResolvedValue({
			data: { result: { name: "test" } },
			error: null,
			success: true,
		});

		const mockHttpClient = {
			createNode: mockCreateNode,
			getTdInfo: mockGetTdInfo,
		};

		const client = new TouchDesignerClient({
			httpClient: mockHttpClient as unknown as ITouchDesignerApi,
			logger: nullLogger,
		});

		// First call should trigger compatibility check
		await client.createNode({
			nodeName: "test1",
			nodeType: "null",
			parentPath: "/",
		});

		// Second call should use cached compatibility result
		await client.createNode({
			nodeName: "test2",
			nodeType: "null",
			parentPath: "/",
		});

		// getTdInfo should only be called once (during first compatibility check)
		expect(mockGetTdInfo).toHaveBeenCalledTimes(1);
		// createNode should be called twice
		expect(mockCreateNode).toHaveBeenCalledTimes(2);
	});

	test("should re-check compatibility when success cache TTL expires", async () => {
		vi.useFakeTimers();
		try {
			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: {
					mcpApiVersion: "1.3.1",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const mockGetNodes = vi.fn().mockResolvedValue({
				data: { nodes: [] },
				error: null,
				success: true,
			});

			const mockHttpClient = {
				getNodes: mockGetNodes,
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			await client.getNodes({ parentPath: "/" });
			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(SUCCESS_CACHE_TTL_MS - 1000);
			await client.getNodes({ parentPath: "/project1" });
			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(2000);
			await client.getNodes({ parentPath: "/project1" });
			expect(mockGetTdInfo).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	test("should re-check compatibility after error", async () => {
		const mockGetTdInfo = vi
			.fn()
			.mockResolvedValueOnce({
				// First call fails compatibility
				data: {
					mcpApiVersion: "2.0.0", // Major version mismatch
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			})
			.mockResolvedValueOnce({
				// Second call succeeds
				data: {
					mcpApiVersion: "1.3.1",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

		const mockCreateNode = vi.fn().mockResolvedValue({
			data: { result: { name: "test" } },
			error: null,
			success: true,
		});

		const mockHttpClient = {
			createNode: mockCreateNode,
			getTdInfo: mockGetTdInfo,
		};

		const client = new TouchDesignerClient({
			httpClient: mockHttpClient as unknown as ITouchDesignerApi,
			logger: nullLogger,
		});

		// First call should fail due to version mismatch
		await expect(
			client.createNode({
				nodeName: "test1",
				nodeType: "null",
				parentPath: "/",
			}),
		).rejects.toThrow();

		// After error, cached error should be thrown immediately
		await expect(
			client.createNode({
				nodeName: "test2",
				nodeType: "null",
				parentPath: "/",
			}),
		).rejects.toThrow();

		// getTdInfo should only be called once (error is cached)
		expect(mockGetTdInfo).toHaveBeenCalledTimes(1);
		// createNode should never be called
		expect(mockCreateNode).toHaveBeenCalledTimes(0);
	});

	describe("Connection error handling", () => {
		test("should format ECONNREFUSED error with helpful message", async () => {
			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: null,
				error: "connect ECONNREFUSED 127.0.0.1:9981",
				success: false,
			});

			const mockHttpClient = {
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			await expect(client.getTdInfo()).rejects.toThrow(
				/TouchDesigner is not running/,
			);
		});

		test("should format ETIMEDOUT error with helpful message", async () => {
			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: null,
				error: "connect ETIMEDOUT",
				success: false,
			});

			const mockHttpClient = {
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			await expect(client.getTdInfo()).rejects.toThrow(/Connection Timeout/);
		});

		test("should format ENOTFOUND error with helpful message", async () => {
			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: null,
				error: "getaddrinfo ENOTFOUND invalid-host",
				success: false,
			});

			const mockHttpClient = {
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			await expect(client.getTdInfo()).rejects.toThrow(
				/Invalid Host Configuration/,
			);
		});

		test("should handle lowercase error codes", async () => {
			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: null,
				error: "getaddrinfo enotfound invalid-host",
				success: false,
			});

			const mockHttpClient = {
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			await expect(client.getTdInfo()).rejects.toThrow(
				/Invalid Host Configuration/,
			);
		});

		test("should handle mixed case connection refused error", async () => {
			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: null,
				error: "Connect ECONNREFUSED 127.0.0.1:9981",
				success: false,
			});

			const mockHttpClient = {
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			await expect(client.getTdInfo()).rejects.toThrow(
				/TouchDesigner Connection Failed/,
			);
		});

		test("should retry after error cache TTL expires", async () => {
			vi.useFakeTimers();

			const mockGetTdInfo = vi
				.fn()
				.mockResolvedValueOnce({
					// First call fails
					data: null,
					error: "connect ECONNREFUSED 127.0.0.1:9981",
					success: false,
				})
				.mockResolvedValueOnce({
					// Second call (after TTL) succeeds
					data: {
						mcpApiVersion: "1.3.1",
						osName: "macOS",
						osVersion: "12.6.1",
						server: "TouchDesigner",
						version: "2023.11050",
					},
					error: null,
					success: true,
				});

			const mockCreateNode = vi.fn().mockResolvedValue({
				data: { result: { name: "test" } },
				error: null,
				success: true,
			});

			const mockHttpClient = {
				createNode: mockCreateNode,
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			// First call should fail
			await expect(
				client.createNode({
					nodeName: "test1",
					nodeType: "null",
					parentPath: "/",
				}),
			).rejects.toThrow();

			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);

			// Advance time past the ERROR_CACHE_TTL_MS
			vi.advanceTimersByTime(ERROR_CACHE_TTL_MS + 1000);

			// Second call should retry and succeed
			const result = await client.createNode({
				nodeName: "test2",
				nodeType: "null",
				parentPath: "/",
			});

			expect(result.success).toBe(true);
			expect(mockGetTdInfo).toHaveBeenCalledTimes(2);
			expect(mockCreateNode).toHaveBeenCalledTimes(1);

			vi.useRealTimers();
		});

		test("should clear cached error when compatibility cache is invalidated", async () => {
			const mockGetTdInfo = vi
				.fn()
				.mockResolvedValueOnce({
					data: {
						mcpApiVersion: "",
						osName: "macOS",
						osVersion: "12.6.1",
						server: "TouchDesigner",
						version: "2023.11050",
					},
					error: null,
					success: true,
				})
				.mockResolvedValue({
					data: {
						mcpApiVersion: "1.3.1",
						osName: "macOS",
						osVersion: "12.6.1",
						server: "TouchDesigner",
						version: "2023.11050",
					},
					error: null,
					success: true,
				});

			const mockCreateNode = vi.fn().mockResolvedValue({
				data: { result: { name: "test" } },
				error: null,
				success: true,
			});

			const client = new TouchDesignerClient({
				httpClient: {
					createNode: mockCreateNode,
					getTdInfo: mockGetTdInfo,
				} as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			await expect(
				client.createNode({
					nodeName: "test",
					nodeType: "null",
					parentPath: "/",
				}),
			).rejects.toThrow("Version Information Missing");

			expect(mockCreateNode).not.toHaveBeenCalled();

			const infoResult = await client.getTdInfo();
			expect(infoResult.success).toBe(true);
			expect(mockGetTdInfo).toHaveBeenCalledTimes(3);
		});

		test("should not retry before error cache TTL expires", async () => {
			vi.useFakeTimers();

			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: null,
				error: "connect ECONNREFUSED 127.0.0.1:9981",
				success: false,
			});

			const mockCreateNode = vi.fn().mockResolvedValue({
				data: { result: { name: "test" } },
				error: null,
				success: true,
			});

			const mockHttpClient = {
				createNode: mockCreateNode,
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			// First call should fail
			await expect(
				client.createNode({
					nodeName: "test1",
					nodeType: "null",
					parentPath: "/",
				}),
			).rejects.toThrow();

			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);

			// Before TTL expires
			vi.advanceTimersByTime(ERROR_CACHE_TTL_MS - 1000);

			// Second call should use cached error
			await expect(
				client.createNode({
					nodeName: "test2",
					nodeType: "null",
					parentPath: "/",
				}),
			).rejects.toThrow();

			// getTdInfo should still be called only once
			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);
			expect(mockCreateNode).toHaveBeenCalledTimes(0);

			vi.advanceTimersByTime(1000);

			// After TTL expires, next call should retry
			await expect(
				client.createNode({
					nodeName: "test3",
					nodeType: "null",
					parentPath: "/",
				}),
			).rejects.toThrow();

			// getTdInfo should be called again
			expect(mockGetTdInfo).toHaveBeenCalledTimes(2);
			expect(mockCreateNode).toHaveBeenCalledTimes(0);

			vi.useRealTimers();
		});

		test("should cache BELOW_MIN_VERSION errors", async () => {
			const mockGetTdInfo = vi.fn().mockResolvedValue({
				data: {
					mcpApiVersion: "1.2.9",
					osName: "macOS",
					osVersion: "12.6.1",
					server: "TouchDesigner",
					version: "2023.11050",
				},
				error: null,
				success: true,
			});

			const mockCreateNode = vi.fn().mockResolvedValue({
				data: { result: { name: "test" } },
				error: null,
				success: true,
			});

			const mockHttpClient = {
				createNode: mockCreateNode,
				getTdInfo: mockGetTdInfo,
			};

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as unknown as ITouchDesignerApi,
				logger: nullLogger,
			});

			// First call should fail with BELOW_MIN_VERSION
			await expect(
				client.createNode({
					nodeName: "test1",
					nodeType: "null",
					parentPath: "/",
				}),
			).rejects.toThrow("TouchDesigner API Server Update Required");

			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);

			// Second call should use cached error without calling getTdInfo again
			await expect(
				client.createNode({
					nodeName: "test2",
					nodeType: "null",
					parentPath: "/",
				}),
			).rejects.toThrow("TouchDesigner API Server Update Required");

			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);
			expect(mockCreateNode).toHaveBeenCalledTimes(0);
		});

		test("should format connection error when getTdInfo rejects with AxiosError", async () => {
			// AxiosError constructor: (message, code, config, request, response)
			const axiosError = new AxiosError(
				"connect ECONNREFUSED 127.0.0.1:9981", // message
				"ECONNREFUSED", // code
			);

			const mockGetTdInfo = vi.fn().mockRejectedValue(axiosError);

			const mockHttpClient = {
				getTdInfo: mockGetTdInfo,
			} as Partial<ITouchDesignerApi>;

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as ITouchDesignerApi,
				logger: nullLogger,
			});

			await expect(client.getTdInfo()).rejects.toThrow(
				/TouchDesigner Connection Failed/,
			);
			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);
		});

		test("should propagate programming errors (non-AxiosError)", async () => {
			const mockGetTdInfo = vi
				.fn()
				.mockRejectedValue(
					new TypeError("Cannot read property 'x' of undefined"),
				);

			const mockHttpClient = {
				getTdInfo: mockGetTdInfo,
			} as Partial<ITouchDesignerApi>;

			const client = new TouchDesignerClient({
				httpClient: mockHttpClient as ITouchDesignerApi,
				logger: nullLogger,
			});

			// Programming errors should propagate with their original message
			await expect(client.getTdInfo()).rejects.toThrow(
				"Cannot read property 'x' of undefined",
			);
			expect(mockGetTdInfo).toHaveBeenCalledTimes(1);
		});
	});
});

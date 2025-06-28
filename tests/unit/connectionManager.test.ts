import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import type { ILogger } from "../../src/core/logger.js";
import {
	createErrorResult,
	createSuccessResult,
} from "../../src/core/result.js";
import { ConnectionManager } from "../../src/server/connectionManager.js";
import type { TouchDesignerClient } from "../../src/tdClient/touchDesignerClient.js";

// Mock dependencies
const mockServer = {
	connect: vi.fn(),
	close: vi.fn(),
} as unknown as McpServer;

const mockLogger = {
	log: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
} as ILogger;

const mockTdClient = {
	getTdInfo: vi.fn(),
} as unknown as TouchDesignerClient;

const mockTransport = {} as Transport;

describe("ConnectionManager", () => {
	let connectionManager: ConnectionManager;
	let consoleErrorSpy: MockInstance;
	let consoleLogSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		// Spy on console methods
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		// Setup environment variables
		process.env.TD_WEB_SERVER_HOST = "http://localhost";
		process.env.TD_WEB_SERVER_PORT = "9981";

		connectionManager = new ConnectionManager(
			mockServer,
			mockLogger,
			mockTdClient,
		);
	});

	describe("connect", () => {
		it("should successfully connect when MCP server and TouchDesigner are available", async () => {
			// Arrange
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createSuccessResult({
					server: "TouchDesigner",
					version: "2023.11340",
					osName: "macOS",
					osVersion: "12.6.1",
				}),
			);

			// Act
			const result = await connectionManager.connect(mockTransport);

			// Assert
			expect(result.success).toBe(true);
			expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
			expect(mockLogger.log).toHaveBeenCalledWith(
				"Server connected and ready to process requests: http://localhost:9981",
			);
			expect(mockTdClient.getTdInfo).toHaveBeenCalled();
			expect(connectionManager.isConnected()).toBe(true);
		});

		it("should return success if already connected", async () => {
			// Arrange - Connect first
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createSuccessResult({
					server: "TouchDesigner",
					version: "2023.11340",
					osName: "macOS",
					osVersion: "12.6.1",
				}),
			);
			await connectionManager.connect(mockTransport);

			// Act
			const result = await connectionManager.connect(mockTransport);

			// Assert
			expect(result.success).toBe(true);
			expect(mockLogger.log).toHaveBeenCalledWith(
				"MCP server already connected",
			);
		});

		it("should handle MCP server connection failure", async () => {
			// Arrange
			const connectionError = new Error("MCP connection failed");
			vi.mocked(mockServer.connect).mockRejectedValue(connectionError);

			// Act
			const result = await connectionManager.connect(mockTransport);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(connectionError);
			}
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Fatal error starting server! Check TouchDesigner setup and starting webserver. For detailed setup instructions, see https://github.com/8beeeaaat/touchdesigner-mcp",
				connectionError,
			);
			expect(connectionManager.isConnected()).toBe(false);
		});

		it("should handle TouchDesigner connection failure", async () => {
			// Arrange
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			const tdError = new Error("TouchDesigner not available");
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createErrorResult(tdError),
			);

			// Act
			const result = await connectionManager.connect(mockTransport);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe(
					"Failed to connect to TouchDesigner: TouchDesigner not available",
				);
			}
			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(connectionManager.isConnected()).toBe(false);
		});

		it("should handle TouchDesigner getTdInfo throwing an error", async () => {
			// Arrange
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			const tdError = new Error("Network error");
			vi.mocked(mockTdClient.getTdInfo).mockRejectedValue(tdError);

			// Act
			const result = await connectionManager.connect(mockTransport);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe(
					"Failed to connect to TouchDesigner: Network error",
				);
			}
			expect(connectionManager.isConnected()).toBe(false);
		});

		it("should handle non-Error objects thrown during connection", async () => {
			// Arrange
			vi.mocked(mockServer.connect).mockRejectedValue("String error");

			// Act
			const result = await connectionManager.connect(mockTransport);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe("String error");
			}
			expect(connectionManager.isConnected()).toBe(false);
		});
	});

	describe("disconnect", () => {
		it("should successfully disconnect when connected", async () => {
			// Arrange - Connect first
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createSuccessResult({
					server: "TouchDesigner",
					version: "2023.11340",
					osName: "macOS",
					osVersion: "12.6.1",
				}),
			);
			await connectionManager.connect(mockTransport);
			vi.mocked(mockServer.close).mockResolvedValue(undefined);

			// Act
			const result = await connectionManager.disconnect();

			// Assert
			expect(result.success).toBe(true);
			expect(mockServer.close).toHaveBeenCalled();
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"MCP server disconnected from MCP",
			);
			expect(connectionManager.isConnected()).toBe(false);
		});

		it("should return success if not connected", async () => {
			// Act
			const result = await connectionManager.disconnect();

			// Assert
			expect(result.success).toBe(true);
			expect(consoleLogSpy).toHaveBeenCalledWith("MCP server not connected");
			expect(mockServer.close).not.toHaveBeenCalled();
		});

		it("should handle server close failure", async () => {
			// Arrange - Connect first
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createSuccessResult({
					server: "TouchDesigner",
					version: "2023.11340",
					osName: "macOS",
					osVersion: "12.6.1",
				}),
			);
			await connectionManager.connect(mockTransport);

			const closeError = new Error("Close failed");
			vi.mocked(mockServer.close).mockRejectedValue(closeError);

			// Act
			const result = await connectionManager.disconnect();

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(closeError);
			}
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Error disconnecting from server",
				closeError,
			);
		});

		it("should handle non-Error objects during disconnect", async () => {
			// Arrange - Connect first
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createSuccessResult({
					server: "TouchDesigner",
					version: "2023.11340",
					osName: "macOS",
					osVersion: "12.6.1",
				}),
			);
			await connectionManager.connect(mockTransport);

			vi.mocked(mockServer.close).mockRejectedValue("String error");

			// Act
			const result = await connectionManager.disconnect();

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe("String error");
			}
		});
	});

	describe("isConnected", () => {
		it("should return false when not connected", () => {
			expect(connectionManager.isConnected()).toBe(false);
		});

		it("should return true when connected", async () => {
			// Arrange
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createSuccessResult({
					server: "TouchDesigner",
					version: "2023.11340",
					osName: "macOS",
					osVersion: "12.6.1",
				}),
			);

			// Act
			await connectionManager.connect(mockTransport);

			// Assert
			expect(connectionManager.isConnected()).toBe(true);
		});

		it("should return false after disconnect", async () => {
			// Arrange - Connect first
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			vi.mocked(mockTdClient.getTdInfo).mockResolvedValue(
				createSuccessResult({
					server: "TouchDesigner",
					version: "2023.11340",
					osName: "macOS",
					osVersion: "12.6.1",
				}),
			);
			await connectionManager.connect(mockTransport);
			vi.mocked(mockServer.close).mockResolvedValue(undefined);

			// Act
			await connectionManager.disconnect();

			// Assert
			expect(connectionManager.isConnected()).toBe(false);
		});
	});

	describe("error messages", () => {
		it("should display helpful setup instructions on connection failure", async () => {
			// Arrange
			const connectionError = new Error("Connection failed");
			vi.mocked(mockServer.connect).mockRejectedValue(connectionError);

			// Act
			await connectionManager.connect(mockTransport);

			// Assert
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Fatal error starting server! Check TouchDesigner setup and starting webserver. For detailed setup instructions, see https://github.com/8beeeaaat/touchdesigner-mcp",
				connectionError,
			);
		});
	});
});

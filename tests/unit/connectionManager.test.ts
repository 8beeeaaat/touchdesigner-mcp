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
import { ConnectionManager } from "../../src/server/connectionManager.js";

const mockServer = {
	close: vi.fn(),
	connect: vi.fn(),
} as unknown as McpServer;

const mockLogger = {
	sendLog: vi.fn(),
} as ILogger;

const mockTransport = {} as Transport;

describe("ConnectionManager", () => {
	let connectionManager: ConnectionManager;
	let consoleErrorSpy: MockInstance;
	let consoleLogSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		process.env.TD_WEB_SERVER_HOST = "http://127.0.0.1";
		process.env.TD_WEB_SERVER_PORT = "9981";

		connectionManager = new ConnectionManager(mockServer, mockLogger);
	});

	describe("connect", () => {
		it("should successfully connect when MCP server is available", async () => {
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);

			const result = await connectionManager.connect(mockTransport);

			expect(result.success).toBe(true);
			expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: "Server connected and ready to process requests: http://127.0.0.1:9981",
					level: "info",
				}),
			);
			expect(connectionManager.isConnected()).toBe(true);
		});

		it("should return success if already connected", async () => {
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			await connectionManager.connect(mockTransport);

			const result = await connectionManager.connect(mockTransport);

			expect(result.success).toBe(true);
			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: "MCP server already connected",
					level: "info",
				}),
			);
		});

		it("should handle MCP server connection failure", async () => {
			const connectionError = new Error("MCP connection failed");
			vi.mocked(mockServer.connect).mockRejectedValue(connectionError);

			const result = await connectionManager.connect(mockTransport);

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

		it("should handle non-Error objects thrown during connection", async () => {
			vi.mocked(mockServer.connect).mockRejectedValue("String error");

			const result = await connectionManager.connect(mockTransport);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toBe("String error");
			}
			expect(connectionManager.isConnected()).toBe(false);
		});
	});

	describe("disconnect", () => {
		it("should successfully disconnect when connected", async () => {
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			await connectionManager.connect(mockTransport);
			vi.mocked(mockServer.close).mockResolvedValue(undefined);

			const result = await connectionManager.disconnect();

			expect(result.success).toBe(true);
			expect(mockServer.close).toHaveBeenCalled();
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"MCP server disconnected from MCP",
			);
			expect(connectionManager.isConnected()).toBe(false);
		});

		it("should return success if not connected", async () => {
			const result = await connectionManager.disconnect();

			expect(result.success).toBe(true);
			expect(consoleLogSpy).toHaveBeenCalledWith("MCP server not connected");
			expect(mockServer.close).not.toHaveBeenCalled();
		});

		it("should handle server close failure", async () => {
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			await connectionManager.connect(mockTransport);

			const closeError = new Error("Close failed");
			vi.mocked(mockServer.close).mockRejectedValue(closeError);

			const result = await connectionManager.disconnect();

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
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			await connectionManager.connect(mockTransport);
			vi.mocked(mockServer.close).mockRejectedValue("String error");

			const result = await connectionManager.disconnect();

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
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);

			await connectionManager.connect(mockTransport);

			expect(connectionManager.isConnected()).toBe(true);
		});

		it("should return false after disconnect", async () => {
			vi.mocked(mockServer.connect).mockResolvedValue(undefined);
			await connectionManager.connect(mockTransport);
			vi.mocked(mockServer.close).mockResolvedValue(undefined);

			await connectionManager.disconnect();

			expect(connectionManager.isConnected()).toBe(false);
		});
	});

	describe("error messages", () => {
		it("should display helpful setup instructions on connection failure", async () => {
			const connectionError = new Error("Connection failed");
			vi.mocked(mockServer.connect).mockRejectedValue(connectionError);

			await connectionManager.connect(mockTransport);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Fatal error starting server! Check TouchDesigner setup and starting webserver. For detailed setup instructions, see https://github.com/8beeeaaat/touchdesigner-mcp",
				connectionError,
			);
		});
	});
});

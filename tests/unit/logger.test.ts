import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { McpLogger } from "../../src/core/logger.js";

describe("Logger", () => {
	describe("McpLogger", () => {
		it("should send log messages to MCP server", () => {
			const mockSendLoggingMessage = vi.fn();
			const mockServer = {
				server: {
					sendLoggingMessage: mockSendLoggingMessage,
				},
			};

			const logger = new McpLogger(mockServer as unknown as McpServer);
			logger.sendLog({
				data: "test message",
				level: "info",
			});

			expect(mockSendLoggingMessage).toHaveBeenCalledWith({
				data: "test message",
				level: "info",
			});
		});

		it("should handle server not connected errors gracefully", () => {
			const mockSendLoggingMessage = vi.fn().mockImplementation(() => {
				throw new Error("Not connected");
			});

			const mockServer = {
				server: {
					sendLoggingMessage: mockSendLoggingMessage,
				},
			};

			const logger = new McpLogger(mockServer as unknown as McpServer);

			expect(() =>
				logger.sendLog({
					data: "test message",
					level: "info",
				}),
			).not.toThrow();
			expect(mockSendLoggingMessage).toHaveBeenCalled();
		});
	});
});

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { McpLogger } from "../../src/core/logger";

describe("McpLogger", () => {
	let mockServer: McpServer;
	let mockSendLoggingMessage: Mock;
	let consoleErrorSpy: Mock;
	let consoleWarnSpy: Mock;
	let consoleDebugSpy: Mock;
	let consoleLogSpy: Mock;

	beforeEach(() => {
		mockSendLoggingMessage = vi.fn();
		mockServer = {
			server: {
				sendLoggingMessage: mockSendLoggingMessage,
			},
		} as unknown as McpServer;

		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
		consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => { });
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => { });
	});

	it("should send log messages to server", () => {
		const logger = new McpLogger(mockServer);
		const messages = ["test message 1", "test message 2"];

		logger.sendLog({ level: "info", messages });

		expect(mockSendLoggingMessage).toHaveBeenCalledTimes(2);
		expect(mockSendLoggingMessage).toHaveBeenCalledWith({
			data: "test message 1",
			level: "info",
		});
		expect(mockSendLoggingMessage).toHaveBeenCalledWith({
			data: "test message 2",
			level: "info",
		});
	});

	it("should log error messages to console.error", () => {
		const logger = new McpLogger(mockServer);
		const messages = ["error message"];

		logger.sendLog({ level: "error", messages });

		expect(consoleErrorSpy).toHaveBeenCalledWith("error message");
	});

	it("should log warning messages to console.warn", () => {
		const logger = new McpLogger(mockServer);
		const messages = ["warning message"];

		logger.sendLog({ level: "warning", messages });

		expect(consoleWarnSpy).toHaveBeenCalledWith("warning message");
	});

	it("should log debug messages to console.debug", () => {
		const logger = new McpLogger(mockServer);
		const messages = ["debug message"];

		logger.sendLog({ level: "debug", messages });

		expect(consoleDebugSpy).toHaveBeenCalledWith("debug message");
	});

	it("should log info messages to console.log", () => {
		const logger = new McpLogger(mockServer);
		const messages = ["info message"];

		logger.sendLog({ level: "info", messages });

		expect(consoleLogSpy).toHaveBeenCalledWith("info message");
	});

	it("should handle server errors gracefully", () => {
		mockSendLoggingMessage.mockImplementation(() => {
			throw new Error("Not connected");
		});

		const logger = new McpLogger(mockServer);
		const messages = ["test message"];

		expect(() => logger.sendLog({ level: "info", messages })).not.toThrow();
		expect(consoleLogSpy).toHaveBeenCalledWith("Not connected");
	});

	it("should handle non-Error exceptions", () => {
		mockSendLoggingMessage.mockImplementation(() => {
			throw "string error";
		});

		const logger = new McpLogger(mockServer);
		const messages = ["test message"];

		expect(() => logger.sendLog({ level: "error", messages })).not.toThrow();
		expect(consoleErrorSpy).toHaveBeenCalledWith("string error");
	});

	it("should process multiple messages independently", () => {
		mockSendLoggingMessage
			.mockImplementationOnce(() => {
				throw new Error("First failed");
			})
			.mockImplementationOnce(() => { });

		const logger = new McpLogger(mockServer);
		const messages = ["message 1", "message 2"];

		logger.sendLog({ level: "warning", messages });

		expect(mockSendLoggingMessage).toHaveBeenCalledTimes(2);
		expect(consoleWarnSpy).toHaveBeenCalledWith("First failed");
		expect(consoleWarnSpy).toHaveBeenCalledWith("message 2");
	});
});

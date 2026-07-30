import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsoleLogger } from "../../src/core/logger.js";

describe("Logger", () => {
	describe("ConsoleLogger", () => {
		let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		});

		afterEach(() => {
			consoleErrorSpy.mockRestore();
		});

		it("should write to stderr via console.error", () => {
			const logger = new ConsoleLogger();

			logger.sendLog({ data: "test message", level: "info" });

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
		});

		it("should include the uppercased level and the data in the output", () => {
			const logger = new ConsoleLogger();

			logger.sendLog({ data: "test message", level: "warning" });

			const output = consoleErrorSpy.mock.calls[0][0] as string;
			expect(output).toContain("WARNING");
			expect(output).toContain("test message");
		});

		it("should include the logger name when provided", () => {
			const logger = new ConsoleLogger();

			logger.sendLog({
				data: "test message",
				level: "info",
				logger: "MyLogger",
			});

			const output = consoleErrorSpy.mock.calls[0][0] as string;
			expect(output).toContain("MyLogger");
		});

		it("should preserve structured error details in the output", () => {
			const logger = new ConsoleLogger();

			logger.sendLog({
				data: {
					error: new Error("TouchDesigner request failed"),
					errorType: "api_response",
					stack: "diagnostic stack",
				},
				level: "error",
				logger: "TouchDesignerClient",
			});

			const output = consoleErrorSpy.mock.calls[0][0] as string;
			expect(output).toContain("TouchDesigner request failed");
			expect(output).toContain("errorType");
			expect(output).toContain("api_response");
			expect(output).toContain("diagnostic stack");
			expect(output).not.toContain("[object Object]");
		});

		it("should never throw", () => {
			const logger = new ConsoleLogger();

			expect(() =>
				logger.sendLog({ data: "test message", level: "error" }),
			).not.toThrow();
		});
	});
});

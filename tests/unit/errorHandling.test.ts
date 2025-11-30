import { describe, expect, it, vi } from "vitest";
import { handleToolError } from "../../src/core/errorHandling.js";
import type { ILogger } from "../../src/core/logger.js";

describe("errorHandling", () => {
	describe("handleToolError", () => {
		const mockLogger: ILogger = {
			sendLog: vi.fn(),
		};

		it("should handle Error instance correctly", () => {
			const error = new Error("Test error");
			const result = handleToolError(error, mockLogger, "create_td_node", "Operation failed");

			expect(mockLogger.sendLog).toHaveBeenCalledWith({
				level: "error",
				messages: ["create_td_node: Test error"],
			});
			expect(result).toEqual({
				content: [
					{
						text: "create_td_node: Error: Test error. Operation failed",
						type: "text",
					},
				],
				isError: true,
			});
		});

		it("should handle string error correctly", () => {
			const error = "String error";
			const result = handleToolError(error, mockLogger, "create_td_node", "Operation failed");

			expect(mockLogger.sendLog).toHaveBeenCalledWith({
				level: "error",
				messages: ["create_td_node: Test error"],
			});
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("String error");
		});

		it("should handle null error correctly", () => {
			const error = null;
			const result = handleToolError(error, mockLogger, "create_td_node", "Operation failed");

			expect(mockLogger.sendLog).toHaveBeenCalledWith({
				level: "error",
				messages: ["create_td_node: Test error"],
			});
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("Null error received");
		});

		it("should include reference comment when provided", () => {
			const error = new Error("Test error");
			const referenceComment = "See documentation";
			const result = handleToolError(
				error,
				mockLogger,
				"create_td_node",
				referenceComment,
			);

			expect(result.content[0].text).toContain("See documentation");
		});
	});
});

import { describe, expect, it, vi } from "vitest";
import { handleToolError } from "../../src/core/errorHandling.js";
import type { ILogger } from "../../src/core/logger.js";

describe("errorHandling", () => {
	describe("handleToolError", () => {
		const mockLogger: ILogger = {
			debug: vi.fn(),
			error: vi.fn(),
			log: vi.fn(),
			warn: vi.fn(),
		};

		it("should handle Error instance correctly", () => {
			const error = new Error("Test error");
			const result = handleToolError(error, mockLogger, "Operation failed");

			expect(mockLogger.error).toHaveBeenCalledWith("Operation failed", error);
			expect(result).toEqual({
				content: [
					{
						text: "Operation failed: Error: Test error",
						type: "text",
					},
				],
				isError: true,
			});
		});

		it("should handle string error correctly", () => {
			const error = "String error";
			const result = handleToolError(error, mockLogger, "Operation failed");

			expect(mockLogger.error).toHaveBeenCalled();
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("String error");
		});

		it("should handle null error correctly", () => {
			const error = null;
			const result = handleToolError(error, mockLogger, "Operation failed");

			expect(mockLogger.error).toHaveBeenCalled();
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain("Null error received");
		});

		it("should include reference comment when provided", () => {
			const error = new Error("Test error");
			const referenceComment = "See documentation";
			const result = handleToolError(
				error,
				mockLogger,
				"Operation failed",
				referenceComment,
			);

			expect(result.content[0].text).toContain("See documentation");
		});
	});
});

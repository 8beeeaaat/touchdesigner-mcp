import { describe, expect, it } from "vitest";
import {
	formatScriptResult,
	type ScriptResultData,
} from "../../../src/features/tools/presenter/scriptResultFormatter.js";

describe("scriptResultFormatter", () => {
	describe("formatScriptResult", () => {
		it("should format successful execution with simple result in minimal mode", () => {
			const data: ScriptResultData = {
				data: {
					result: 42,
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "minimal",
			});

			expect(result).toContain("Return type: number");
			expect(result).toContain("42");
		});

		it("should format successful execution with no result in minimal mode", () => {
			const data: ScriptResultData = {
				data: {
					result: undefined,
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "minimal",
			});

			expect(result).toContain("Return type: none");
		});

		it("should format array result in minimal mode", () => {
			const data: ScriptResultData = {
				data: {
					result: [1, 2, 3, 4, 5],
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "minimal",
			});

			expect(result).toContain("Return type: array(5)");
			expect(result).toContain("1");
		});

		it("should format object result in minimal mode", () => {
			const data: ScriptResultData = {
				data: {
					result: { baz: 123, foo: "bar" },
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "minimal",
			});

			expect(result).toContain("Return type: object");
			expect(result).toContain("foo");
		});

		it("should format successful execution with result and output in summary mode", () => {
			const data: ScriptResultData = {
				data: {
					output: "Debug message",
					result: { value: 123 },
				},
				success: true,
			};

			const script = "op('/project1').par.value";

			const result = formatScriptResult(data, script, {
				detailLevel: "summary",
			});

			expect(result).toContain("Script Result");
			expect(result).toContain("Snippet: `op('/project1').par.value`");
			expect(result).toContain("Return type: object");
			expect(result).toContain('"value": 123');
			expect(result).toContain("Debug message");
		});

		it("should truncate long script snippets in summary mode", () => {
			const data: ScriptResultData = {
				data: {
					result: "ok",
				},
				success: true,
			};

			const longScript = "a".repeat(150);

			const result = formatScriptResult(data, longScript, {
				detailLevel: "summary",
			});

			expect(result).toContain(`Snippet: \`${"a".repeat(100)}...\``);
		});

		it("should truncate long output in summary mode", () => {
			const data: ScriptResultData = {
				data: {
					output: "x".repeat(250),
					result: "ok",
				},
				success: true,
			};

			const result = formatScriptResult(data, "script", {
				detailLevel: "summary",
			});

			expect(result).toContain("Output type: string");
			expect(result).toContain(`${"x".repeat(200)}...`);
		});

		it("should truncate large results in summary mode", () => {
			const largeResult = { data: "y".repeat(600) };
			const data: ScriptResultData = {
				data: {
					result: largeResult,
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "summary",
			});

			expect(result).toContain("Result truncated");
			expect(result).toContain("Use detailLevel='detailed' for full output");
		});

		it("should format error result", () => {
			const data: ScriptResultData = {
				data: {
					error: "NameError: name 'foo' is not defined",
				},
				success: false,
			};

			const script = "print(foo)";

			const result = formatScriptResult(data, script);

			expect(result).toContain("❌ Script execution failed");
			expect(result).toContain("Script: print(foo)");
			expect(result).toContain("Error: NameError: name 'foo' is not defined");
		});

		it("should return full JSON in detailed mode", () => {
			const data: ScriptResultData = {
				data: {
					output: "Some output",
					result: { complex: "data", nested: { value: 123 } },
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "detailed",
				responseFormat: "json",
			});

			expect(result).toContain('"success": true');
			expect(result).toContain('"complex": "data"');
			expect(result).toContain('"nested"');
			expect(result).toContain('"output": "Some output"');
		});

		it("should handle undefined data", () => {
			const result = formatScriptResult(undefined);

			expect(result).toBe("No result returned.");
		});

		it("should handle empty output string", () => {
			const data: ScriptResultData = {
				data: {
					output: "",
					result: "ok",
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "summary",
			});

			expect(result).not.toContain("Output:");
		});

		it("should handle whitespace-only output", () => {
			const data: ScriptResultData = {
				data: {
					output: "   \n\t  ",
					result: "ok",
				},
				success: true,
			};

			const result = formatScriptResult(data, undefined, {
				detailLevel: "summary",
			});

			expect(result).not.toContain("Output:");
		});
	});
});

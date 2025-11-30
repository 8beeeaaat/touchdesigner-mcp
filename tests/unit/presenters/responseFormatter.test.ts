import { describe, expect, it } from "vitest";
import {
	type DetailLevel,
	type FormatterOptions,
	formatOmissionHint,
	limitArray,
	mergeFormatterOptions,
} from "../../../src/features/tools/presenter/responseFormatter.js";

describe("responseFormatter", () => {
	describe("mergeFormatterOptions", () => {
		it("should return default options when no options provided", () => {
			const result = mergeFormatterOptions();

			expect(result.detailLevel).toBe("summary");
			expect(result.limit).toBeUndefined();
			expect(result.includeHints).toBe(true);
		});

		it("should merge custom mode with defaults", () => {
			const result = mergeFormatterOptions({ mode: "minimal" });

			expect(result.detailLevel).toBe("minimal");
			expect(result.limit).toBeUndefined();
			expect(result.includeHints).toBe(true);
		});

		it("should merge custom limit with defaults", () => {
			const result = mergeFormatterOptions({ limit: 10 });

			expect(result.detailLevel).toBe("summary");
			expect(result.limit).toBe(10);
			expect(result.includeHints).toBe(true);
		});

		it("should merge custom includeHints with defaults", () => {
			const result = mergeFormatterOptions({ includeHints: false });

			expect(result.detailLevel).toBe("summary");
			expect(result.limit).toBeUndefined();
			expect(result.includeHints).toBe(false);
		});

		it("should merge all custom options", () => {
			const options: FormatterOptions = {
				includeHints: false,
				limit: 5,
				mode: "detailed" as DetailLevel,
			};

			const result = mergeFormatterOptions(options);

			expect(result.detailLevel).toBe("detailed");
			expect(result.limit).toBe(5);
			expect(result.includeHints).toBe(false);
		});
	});

	describe("formatOmissionHint", () => {
		it("should return empty string when nothing omitted", () => {
			const result = formatOmissionHint(10, 10, "item");

			expect(result).toBe("");
		});

		it("should return empty string when shown count exceeds total", () => {
			const result = formatOmissionHint(5, 10, "item");

			expect(result).toBe("");
		});

		it("should format hint for single omitted item", () => {
			const result = formatOmissionHint(11, 10, "item");

			expect(result).toBe(
				"\n💡 1 more item(s) omitted. Use detailLevel='detailed' or increase limit to see all.",
			);
		});

		it("should format hint for multiple omitted items", () => {
			const result = formatOmissionHint(100, 20, "node");

			expect(result).toBe(
				"\n💡 80 more node(s) omitted. Use detailLevel='detailed' or increase limit to see all.",
			);
		});

		it("should handle zero shown count", () => {
			const result = formatOmissionHint(10, 0, "class");

			expect(result).toBe(
				"\n💡 10 more class(s) omitted. Use detailLevel='detailed' or increase limit to see all.",
			);
		});
	});

	describe("limitArray", () => {
		it("should return full array when no limit", () => {
			const items = [1, 2, 3, 4, 5];

			const result = limitArray(items, undefined);

			expect(result.items).toEqual(items);
			expect(result.truncated).toBe(false);
		});

		it("should return full array when limit exceeds length", () => {
			const items = [1, 2, 3];

			const result = limitArray(items, 10);

			expect(result.items).toEqual(items);
			expect(result.truncated).toBe(false);
		});

		it("should return full array when limit equals length", () => {
			const items = [1, 2, 3];

			const result = limitArray(items, 3);

			expect(result.items).toEqual(items);
			expect(result.truncated).toBe(false);
		});

		it("should truncate array when limit is less than length", () => {
			const items = [1, 2, 3, 4, 5];

			const result = limitArray(items, 3);

			expect(result.items).toEqual([1, 2, 3]);
			expect(result.truncated).toBe(true);
		});

		it("should return empty array when limit is 0", () => {
			const items = [1, 2, 3];

			const result = limitArray(items, 0);

			expect(result.items).toEqual([]);
			expect(result.truncated).toBe(true);
		});

		it("should handle empty array", () => {
			const items: number[] = [];

			const result = limitArray(items, 5);

			expect(result.items).toEqual([]);
			expect(result.truncated).toBe(false);
		});
	});
});

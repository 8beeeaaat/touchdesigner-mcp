import { describe, expect, it } from "vitest";
import {
	ERROR_DASHBOARD_URI,
	toErrorDashboardData,
} from "../../src/features/ui/errorDashboardResource.js";
import type { TdNodeErrorReport } from "../../src/gen/endpoints/TouchDesignerAPI.js";

function report(overrides: Partial<TdNodeErrorReport> = {}): TdNodeErrorReport {
	return {
		errorCount: 0,
		errors: [],
		hasErrors: false,
		nodeName: "geo1",
		nodePath: "/project1/geo1",
		opType: "geometryCOMP",
		...overrides,
	};
}

describe("ERROR_DASHBOARD_URI", () => {
	it("is a ui:// resource uri", () => {
		expect(ERROR_DASHBOARD_URI).toMatch(/^ui:\/\//);
	});
});

describe("toErrorDashboardData", () => {
	it("keeps node identity and clean state", () => {
		const data = toErrorDashboardData(report());
		expect(data.nodePath).toBe("/project1/geo1");
		expect(data.hasErrors).toBe(false);
		expect(data.errorCount).toBe(0);
		expect(data.errors).toEqual([]);
	});

	it("passes the error entries through verbatim", () => {
		const data = toErrorDashboardData(
			report({
				errorCount: 2,
				errors: [
					{
						message: "Cannot load file",
						nodeName: "moviefilein1",
						nodePath: "/project1/moviefilein1",
						opType: "moviefileinTOP",
					},
					{
						message: "Resolution mismatch",
						nodeName: "comp1",
						nodePath: "/project1/comp1",
						opType: "compositeTOP",
					},
				],
				hasErrors: true,
			}),
		);
		expect(data.hasErrors).toBe(true);
		expect(data.errorCount).toBe(2);
		expect(data.errors).toHaveLength(2);
		expect(data.errors[0]).toMatchObject({
			message: "Cannot load file",
			nodeName: "moviefilein1",
		});
	});
});

import { describe, expect, it } from "vitest";
import {
	formatNodeErrors,
	type NodeErrorReportData,
} from "../../../src/features/tools/presenter/nodeErrorsFormatter.js";
import type { TdNodeError } from "../../../src/gen/endpoints/TouchDesignerAPI.js";

describe("nodeErrorsFormatter", () => {
	const entry = (
		name: string,
		message: string,
		level: TdNodeError["level"] = "error",
		opType = "constantTOP",
	): TdNodeError => ({
		level,
		message,
		nodeName: name,
		nodePath: `/project1/probe/${name}`,
		opType,
	});

	const report = (
		errors: TdNodeError[],
		overrides: Partial<NodeErrorReportData> = {},
	): NodeErrorReportData => ({
		errorCount: errors.filter((e) => e.level !== "warning").length,
		errors,
		hasErrors: errors.some((e) => e.level !== "warning"),
		hasWarnings: errors.some((e) => e.level === "warning"),
		nodeName: "probe",
		nodePath: "/project1/probe",
		opType: "baseCOMP",
		warningCount: errors.filter((e) => e.level === "warning").length,
		...overrides,
	});

	it("reports a clean node", () => {
		const result = formatNodeErrors(report([]));

		expect(result).toContain("No errors or warnings reported");
		expect(result).toContain("Errors: 0");
	});

	it("still reports entries when only warnings were found", () => {
		// hasErrors is false here; the formatter must not treat that as "clean",
		// since TouchDesigner reports missing files as warnings.
		const data = report([
			entry(
				"missing_movie",
				"Failed to open file.",
				"warning",
				"moviefileinTOP",
			),
		]);

		expect(data.hasErrors).toBe(false);

		const result = formatNodeErrors(data);

		expect(result).not.toContain("No errors or warnings reported");
		expect(result).toContain("Failed to open file.");
		expect(result).toContain("warning");
	});

	it("counts errors and warnings separately", () => {
		const result = formatNodeErrors(
			report([
				entry("no_input_displace", "Not enough sources specified"),
				entry(
					"bad_select",
					'Invalid path for node "/project1/gone"',
					"warning",
				),
				entry("missing_table", "File not found.", "warning"),
			]),
			{ responseFormat: "markdown" },
		);

		expect(result).toContain("Errors: 1");
		expect(result).toContain("Warnings: 2");
	});

	it("collapses a multi-line traceback onto one line", () => {
		const traceback =
			"AttributeError: 'NoneType' object has no attribute 'par'\n" +
			", line 1, in <module>\n" +
			"Context:(Parameter: Resolution)";

		const result = formatNodeErrors(report([entry("bad_res", traceback)]), {
			responseFormat: "markdown",
		});

		// A raw newline would break out of the markdown table row.
		expect(result).toContain(
			"AttributeError: 'NoneType' object has no attribute 'par' ⏎ , line 1, in <module> ⏎ Context:(Parameter: Resolution)",
		);
	});

	it("keeps the owning node path on each entry", () => {
		const result = formatNodeErrors(
			report([entry("bad_res", "AttributeError: boom")]),
		);

		expect(result).toContain("/project1/probe/bad_res");
	});

	it("orders errors ahead of warnings", () => {
		const result = formatNodeErrors(
			report([
				entry("bad_select", "Invalid path for node", "warning"),
				entry("no_input_displace", "Not enough sources specified"),
			]),
		);

		expect(result.indexOf("Not enough sources specified")).toBeLessThan(
			result.indexOf("Invalid path for node"),
		);
	});

	it("treats a missing level as an error", () => {
		const legacy: TdNodeError = {
			message: "Not enough sources specified",
			nodeName: "displace1",
			nodePath: "/project1/probe/displace1",
			opType: "displaceTOP",
		};

		const result = formatNodeErrors(report([legacy]));

		expect(result).toContain("| error |");
	});

	it("carries the level through the minimal plain-text body", () => {
		const result = formatNodeErrors(
			report([entry("bad_select", "Invalid path for node", "warning")]),
			{ detailLevel: "minimal", responseFormat: "json" },
		);

		expect(result).toContain('"level": "warning"');
	});

	it("omits entries beyond the limit and says how many", () => {
		const entries = Array.from({ length: 5 }, (_, i) =>
			entry(`op${i}`, `failure ${i}`),
		);

		const result = formatNodeErrors(report(entries), { limit: 2 });

		expect(result).toContain("3 more entries omitted");
	});
});

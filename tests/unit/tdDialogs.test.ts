import { afterEach, describe, expect, it } from "vitest";
import {
	classifyDialog,
	dedupeDialogs,
	dismissTdUiDialog,
	inspectTdUi,
	isDismissBlockedTitle,
	parseInspectJson,
	setPowershellRunnerForTests,
} from "../../src/lifecycle/tdDialogs.js";

afterEach(() => {
	setPowershellRunnerForTests(null);
});

describe("classifyDialog", () => {
	it("marks duplication as hard", () => {
		expect(
			classifyDialog(
				"/project1/tdmcp_bridge",
				"Unexpected node duplication (/project1/tdmcp_bridge) in file.",
			),
		).toBe("hard");
		expect(classifyDialog("", "unexpected node name duplication for foo")).toBe(
			"hard",
		);
	});

	it("marks Backwards Compatiblity as soft", () => {
		expect(classifyDialog("Backwards Compatiblity Issue", "OSC…")).toBe("soft");
	});

	it("defaults to unknown", () => {
		expect(classifyDialog("/project1/foo", "something else")).toBe("unknown");
	});
});

describe("isDismissBlockedTitle", () => {
	it("blocks empty and TouchDesigner chrome", () => {
		expect(isDismissBlockedTitle("")).toBe(true);
		expect(isDismissBlockedTitle("TouchDesigner")).toBe(true);
		expect(
			isDismissBlockedTitle("TouchDesigner 2025.33070: C:/tmp/project.toe"),
		).toBe(true);
	});

	it("allows op-path and product dialog titles", () => {
		expect(isDismissBlockedTitle("/project1/tdmcp_bridge")).toBe(false);
		expect(isDismissBlockedTitle("Backwards Compatiblity Issue")).toBe(false);
	});
});

describe("parseInspectJson", () => {
	it("parses UIA fixture and classifies", () => {
		const raw = JSON.stringify({
			dialogs: [
				{
					message:
						"Unexpected node duplication (/project1/tdmcp_bridge) in file.",
					title: "/project1/tdmcp_bridge",
				},
				{ message: "x", title: "TouchDesigner" },
			],
			mainWindowTitle: "/project1/tdmcp_bridge",
			responding: true,
		});
		const parsed = parseInspectJson(raw);
		expect(parsed.responding).toBe(true);
		expect(parsed.dialogs).toHaveLength(1);
		expect(parsed.dialogs[0]?.severity).toBe("hard");
		expect(parsed.dialogs[0]?.title).toBe("/project1/tdmcp_bridge");
	});

	it("handles empty/invalid", () => {
		expect(parseInspectJson("").dialogs).toEqual([]);
		expect(parseInspectJson("not-json").dialogs).toEqual([]);
	});
});

describe("dedupeDialogs", () => {
	it("dedupes by title+message", () => {
		const d = {
			message: "m",
			severity: "hard" as const,
			title: "/project1/a",
		};
		expect(dedupeDialogs([d, d, { ...d, message: "other" }])).toHaveLength(2);
	});
});

describe("inspectTdUi / dismissTdUiDialog with mocked PS", () => {
	it("sets inspectTimedOut when runner times out", async () => {
		setPowershellRunnerForTests(async () => ({
			stdout: "",
			timedOut: true,
		}));
		const result = await inspectTdUi(1234);
		expect(result.inspectTimedOut).toBe(true);
		expect(result.dialogs).toEqual([]);
	});

	it("parses inspect stdout", async () => {
		setPowershellRunnerForTests(async () => ({
			stdout: JSON.stringify({
				dialogs: [
					{
						message: "Unexpected node duplication (x) in file.",
						title: "/project1/x",
					},
				],
				mainWindowTitle: "/project1/x",
				responding: false,
			}),
			timedOut: false,
		}));
		const result = await inspectTdUi(1234);
		expect(result.responding).toBe(false);
		expect(result.dialogs[0]?.severity).toBe("hard");
	});

	it("does not dismiss TouchDesigner title", async () => {
		let called = false;
		setPowershellRunnerForTests(async () => {
			called = true;
			return { stdout: '{"dismissed":true}', timedOut: false };
		});
		const result = await dismissTdUiDialog("TouchDesigner");
		expect(result.dismissed).toBe(false);
		expect(called).toBe(false);
	});

	it("dismisses listed #32770 title when PS reports success", async () => {
		setPowershellRunnerForTests(async () => ({
			stdout: '{"dismissed":true}',
			timedOut: false,
		}));
		const result = await dismissTdUiDialog("/project1/opticalFlow");
		expect(result.dismissed).toBe(true);
	});
});

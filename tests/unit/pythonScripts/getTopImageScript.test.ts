import { describe, expect, it } from "vitest";
import { buildGetTopImageScript } from "../../../src/features/tools/pythonScripts/getTopImageScript.js";

describe("buildGetTopImageScript", () => {
	it("embeds the node path as a Python string literal", () => {
		const script = buildGetTopImageScript({ nodePath: "/project1/text1" });
		expect(script).toContain('node_path = "/project1/text1"');
	});

	it("escapes quotes and backslashes safely via JSON string encoding", () => {
		const script = buildGetTopImageScript({
			nodePath: '/project1/weird"name\\here',
		});
		expect(script).toContain('node_path = "/project1/weird\\"name\\\\here"');
	});

	it("sets max_size to None when maxSize is omitted", () => {
		const script = buildGetTopImageScript({ nodePath: "/project1/top1" });
		expect(script).toContain("max_size = None");
	});

	it("sets max_size to the numeric literal when provided", () => {
		const script = buildGetTopImageScript({
			maxSize: 512,
			nodePath: "/project1/top1",
		});
		expect(script).toContain("max_size = 512");
	});

	it("includes TOP validation, downscale, and cleanup logic", () => {
		const script = buildGetTopImageScript({
			maxSize: 256,
			nodePath: "/project1/top1",
		});
		expect(script).toContain("node.family != 'TOP'");
		// `td.resolutionTOP` (not the bare `resolutionTOP` global) so this also
		// works against TD-side packages predating the #185 namespace injection.
		expect(script).toContain("import td");
		expect(script).toContain("td.resolutionTOP");
		expect(script).toContain("saveByteArray('.jpg')");
		expect(script).toContain("base64.b64encode");
		expect(script).toContain("tmp_top.destroy()");
		// Cleanup must be unconditional so the project is never left dirty.
		expect(script).toContain("finally:");
	});

	it("assigns the base64 string to `result`, the variable the TD executor extracts", () => {
		const script = buildGetTopImageScript({ nodePath: "/project1/top1" });
		expect(script).toMatch(/result = base64\.b64encode/);
	});
});

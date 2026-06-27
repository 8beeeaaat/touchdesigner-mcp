import { describe, expect, it } from "vitest";
import {
	PARAM_EDITOR_URI,
	toParamEditorData,
} from "../../src/features/ui/paramEditorResource.js";
import type { TdNode } from "../../src/gen/endpoints/TouchDesignerAPI.js";

function node(overrides: Partial<TdNode> = {}): TdNode {
	return {
		id: 1,
		name: "text1",
		opType: "textTOP",
		path: "/project1/text1",
		properties: {},
		...overrides,
	};
}

describe("PARAM_EDITOR_URI", () => {
	it("is a ui:// resource uri", () => {
		expect(PARAM_EDITOR_URI).toMatch(/^ui:\/\//);
	});
});

describe("toParamEditorData", () => {
	it("keeps the node path", () => {
		const data = toParamEditorData(node());
		expect(data.nodePath).toBe("/project1/text1");
	});

	it("classifies scalar params by kind", () => {
		const data = toParamEditorData(
			node({ properties: { active: true, scale: 2, text: "hi" } }),
		);
		expect(data.params).toEqual(
			expect.arrayContaining([
				{ kind: "string", name: "text", value: "hi" },
				{ kind: "number", name: "scale", value: 2 },
				{ kind: "boolean", name: "active", value: true },
			]),
		);
	});

	it("drops non-scalar properties (objects, arrays, null)", () => {
		const data = toParamEditorData(
			node({
				properties: {
					empty: null,
					keep: "ok",
					list: [1, 2],
					nested: { a: 1 },
				},
			}),
		);
		expect(data.params.map((p) => p.name)).toEqual(["keep"]);
	});

	it("returns an empty list when there are no scalar params", () => {
		const data = toParamEditorData(node({ properties: {} }));
		expect(data.params).toEqual([]);
	});
});

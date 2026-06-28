import { describe, expect, it } from "vitest";
import {
	PARAM_EDITOR_URI,
	toParamEditorData,
} from "../../src/features/ui/paramEditorResource.js";
import type { TdNodeParSpecs } from "../../src/gen/endpoints/TouchDesignerAPI.js";

function specs(overrides: Partial<TdNodeParSpecs> = {}): TdNodeParSpecs {
	return {
		nodeName: "text1",
		nodePath: "/project1/text1",
		opType: "textTOP",
		pars: [],
		...overrides,
	};
}

describe("PARAM_EDITOR_URI", () => {
	it("is a ui:// resource uri", () => {
		expect(PARAM_EDITOR_URI).toMatch(/^ui:\/\//);
	});
});

describe("toParamEditorData", () => {
	it("keeps node identity", () => {
		const data = toParamEditorData(specs());
		expect(data.nodePath).toBe("/project1/text1");
		expect(data.nodeName).toBe("text1");
		expect(data.opType).toBe("textTOP");
	});

	it("passes parameter specs through verbatim", () => {
		const data = toParamEditorData(
			specs({
				pars: [
					{
						label: "Scale",
						max: 10,
						min: 0,
						name: "scale",
						page: "Transform",
						style: "Float",
						value: 2,
					},
				],
			}),
		);
		expect(data.pars).toHaveLength(1);
		expect(data.pars[0]).toMatchObject({
			max: 10,
			min: 0,
			name: "scale",
			page: "Transform",
			style: "Float",
			value: 2,
		});
	});

	it("handles a node with no parameters", () => {
		const data = toParamEditorData(specs({ pars: [] }));
		expect(data.pars).toEqual([]);
	});
});

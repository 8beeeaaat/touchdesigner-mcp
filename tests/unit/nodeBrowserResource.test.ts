import { describe, expect, it } from "vitest";
import {
	NODE_BROWSER_URI,
	toNodeBrowserData,
} from "../../src/features/ui/nodeBrowserResource.js";
import type { TdNode } from "../../src/gen/endpoints/TouchDesignerAPI.js";

function node(overrides: Partial<TdNode> = {}): TdNode {
	return {
		id: 1,
		name: "title",
		opType: "textTOP",
		path: "/project1/title",
		properties: { foo: "bar" },
		...overrides,
	};
}

describe("NODE_BROWSER_URI", () => {
	it("is a ui:// resource uri", () => {
		expect(NODE_BROWSER_URI).toMatch(/^ui:\/\//);
	});
});

describe("toNodeBrowserData", () => {
	it("projects nodes down to the browser fields and keeps parentPath", () => {
		const data = toNodeBrowserData([node()], "/project1");
		expect(data.parentPath).toBe("/project1");
		expect(data.nodes).toEqual([
			{ name: "title", opType: "textTOP", path: "/project1/title" },
		]);
	});

	it("drops id and properties from the payload", () => {
		const data = toNodeBrowserData([node()], "/project1");
		expect(data.nodes[0]).not.toHaveProperty("id");
		expect(data.nodes[0]).not.toHaveProperty("properties");
	});

	it("preserves order and handles multiple op types", () => {
		const data = toNodeBrowserData(
			[
				node({ name: "a", opType: "textTOP", path: "/p/a" }),
				node({ id: 2, name: "b", opType: "noiseCHOP", path: "/p/b" }),
			],
			"/p",
		);
		expect(data.nodes.map((n) => n.opType)).toEqual(["textTOP", "noiseCHOP"]);
	});

	it("returns an empty list for no nodes", () => {
		expect(toNodeBrowserData([], "/p")).toEqual({
			nodes: [],
			parentPath: "/p",
		});
	});
});

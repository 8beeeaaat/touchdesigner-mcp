import { describe, expect, it } from "vitest";
import { htmlUiResource } from "../../src/features/ui/uiResource.js";

describe("htmlUiResource", () => {
	const resource = htmlUiResource(
		"ui://touchdesigner/node-browser",
		"<!doctype html><html><body>hi</body></html>",
	);

	it("produces an embeddable resource content block", () => {
		expect(resource.type).toBe("resource");
	});

	it("uses the provided ui:// uri", () => {
		expect(resource.resource.uri).toBe("ui://touchdesigner/node-browser");
	});

	it("declares the MCP Apps HTML mime type", () => {
		expect(resource.resource.mimeType).toBe("text/html;profile=mcp-app");
	});

	it("carries the html document as text", () => {
		expect(resource.resource).toHaveProperty("text");
		expect((resource.resource as { text: string }).text).toContain("<body>hi");
	});
});

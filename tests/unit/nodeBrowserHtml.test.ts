import { describe, expect, it } from "vitest";
import {
	embedJson,
	escapeHtml,
	renderNodeBrowserHtml,
} from "../../src/features/ui/nodeBrowserHtml.js";
import type { TdNode } from "../../src/gen/endpoints/TouchDesignerAPI.js";

function node(overrides: Partial<TdNode> = {}): TdNode {
	return {
		id: 1,
		name: "title",
		opType: "textTOP",
		path: "/project1/title",
		properties: {},
		...overrides,
	};
}

describe("escapeHtml", () => {
	it("escapes all HTML-significant characters", () => {
		expect(escapeHtml("<a&'\">")).toBe("&lt;a&amp;&#39;&quot;&gt;");
	});
});

describe("embedJson", () => {
	it("neutralizes </script> to prevent script-block breakout", () => {
		const out = embedJson({ name: "</script><b>x" });
		expect(out).not.toContain("</script>");
		expect(out).toContain("\\u003c/script>");
	});

	it("round-trips to the original value after unicode escaping", () => {
		const value = { name: "a<b>c", path: "/x" };
		expect(JSON.parse(embedJson(value))).toEqual(value);
	});
});

describe("renderNodeBrowserHtml", () => {
	it("embeds the node list and parent path as JSON data", () => {
		const html = renderNodeBrowserHtml([node()], "/project1");
		expect(html).toContain('type="application/json" id="data"');
		expect(html).toContain('"path":"/project1/title"');
		expect(html).toContain('"parentPath":"/project1"');
	});

	it("embeds the host tool names the iframe app calls back", () => {
		const html = renderNodeBrowserHtml([node()], "/project1");
		expect(html).toContain('"get_td_node_parameters"');
		expect(html).toContain('"create_td_node"');
		expect(html).toContain('"delete_td_node"');
	});

	it("wires the four interactions to host tool calls", () => {
		const html = renderNodeBrowserHtml([node()], "/project1");
		// search box + client-side filter
		expect(html).toContain('id="search"');
		// click → detail
		expect(html).toContain("callTool(tools.detail");
		// create dialog → create
		expect(html).toContain('id="create-dialog"');
		expect(html).toContain("callTool(tools.create");
		// delete → confirm (human-in-the-loop) → delete
		expect(html).toContain("window.confirm");
		expect(html).toContain("callTool(tools.delete");
	});

	it("posts tool calls to the host via the mcp-ui message shape", () => {
		const html = renderNodeBrowserHtml([node()], "/project1");
		expect(html).toContain("window.parent.postMessage");
		expect(html).toContain('type: "tool"');
	});

	it("renders untrusted node names via DOM APIs, never as raw markup", () => {
		const html = renderNodeBrowserHtml(
			[node({ name: "</script><b>pwn", path: "/project1/evil&t" })],
			"/project1",
		);
		// The dangerous substring must not appear verbatim anywhere in the source.
		expect(html).not.toContain("</script><b>pwn");
		expect(html).toContain("\\u003c/script>");
	});

	it("does not pre-group on the server (grouping happens in the iframe)", () => {
		// Two opTypes embedded as flat data; the iframe app groups at render time.
		const html = renderNodeBrowserHtml(
			[node({ opType: "textTOP" }), node({ id: 2, opType: "noiseCHOP" })],
			"/project1",
		);
		expect(html).toContain('"opType":"textTOP"');
		expect(html).toContain('"opType":"noiseCHOP"');
		expect(html).toContain("function groupByType");
	});
});

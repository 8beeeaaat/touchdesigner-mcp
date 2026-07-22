import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getToeNode } from "../../src/toe/nodeInspect.js";
import {
	classifyRef,
	parseCompInputs,
	parseNInputs,
	parseParmRows,
} from "../../src/toe/parseExpand.js";
import { collectRefs, formatRefsText } from "../../src/toe/refs.js";
import { tryFindToeexpand } from "../../src/toe/toeTools.js";
import { collectWireEdges, formatWireEdgesText } from "../../src/toe/wires.js";

const fixtureRoot = fileURLToPath(
	new URL("../fixtures/toe-expand-mini/project.toe.dir", import.meta.url),
);

describe("parseExpand", () => {
	it("parses .n inputs block", () => {
		const body = `TOP:blur
inputs
{
0 	noise1
1 	other
}
end
`;
		expect(parseNInputs(body)).toEqual([
			{ index: 0, name: "noise1" },
			{ index: 1, name: "other" },
		]);
	});

	it("parses .network compinputs", () => {
		const body = `1
compinputs
{
0 	project1/other/out1
	in1
	TOP
}
end
`;
		expect(parseCompInputs(body)).toEqual([
			{
				connector: "in1",
				family: "TOP",
				from: "project1/other/out1",
				index: 0,
			},
		]);
	});

	it("parses parm rows and classifies refs", () => {
		const rows = parseParmRows(`?
externaltox 17 "" "me.parent().fileFolder + '/mods/demo.tox'"
frequency 0 0.5
Audiochop 1 /project1/audio/null_out parent().op('audio/null_out')
?
`);
		expect(rows.map((r) => r.name)).toEqual([
			"externaltox",
			"frequency",
			"Audiochop",
		]);
		expect(classifyRef("externaltox", rows[0].raw)).toBe("externaltox");
		expect(classifyRef("Audiochop", rows[2].raw)).toBe("op");
		expect(classifyRef("frequency", rows[1].raw)).toBeNull();
	});
});

describe("wires + refs on fixture", () => {
	it("collects op and comp wires under project1/fx", () => {
		const edges = collectWireEdges(fixtureRoot, "project1/fx", 5);
		const text = formatWireEdgesText(edges, 80, 6000).text;
		expect(text).toContain("project1/fx/noise1 -> project1/fx/blur1");
		expect(text).toContain("project1/fx/blur1 -> project1/fx/null1");
		const comp = edges.filter((e) => e.kind === "comp");
		// fx.network lives at project1/fx.network — filter project1/fx matches project1/fx as prefix of children but also project1/fx as exact for network file path project1/fx.network -> project1/fx
		expect(comp.some((e) => e.to === "project1/fx")).toBe(true);
		expect(text).toMatch(/project1\/other\/out1 -> project1\/fx/);
	});

	it("collects refs from fx.parm", () => {
		const hits = collectRefs(fixtureRoot, "project1/fx", 4);
		const text = formatRefsText(hits, 40, 6000).text;
		expect(text.toLowerCase()).toContain("externaltox");
		expect(text).toMatch(/audio|op\(/i);
	});
});

describe("getToeNode live", () => {
	const toeexpand = tryFindToeexpand();
	const templateToe = fileURLToPath(
		new URL("../../templates/mcp_project/project.toe", import.meta.url),
	);

	it.skipIf(!toeexpand)(
		"inspects template tdmcp_port_onstart",
		async () => {
			const node = await getToeNode({
				include: ["inputs", "parms", "meta", "text"],
				path: "project1/tdmcp_port_onstart",
				toePath: templateToe,
			});
			expect(node.opHint).toBe("DAT:execute");
			expect(node.path).toBe("project1/tdmcp_port_onstart");
		},
		60_000,
	);
});

import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { collectOutlineEntries, getToeDigest } from "../../src/toe/digest.js";
import {
	_resetExpandInflightForTests,
	ensureExpandedToe,
} from "../../src/toe/expandCache.js";
import { collectCompExtensions } from "../../src/toe/extensions.js";
import { resolveUnderExpand } from "../../src/toe/filesInventory.js";
import { getToeNode } from "../../src/toe/nodeInspect.js";
import { collectRefs } from "../../src/toe/refs.js";
import { tryFindToeexpand } from "../../src/toe/toeTools.js";
import { resolveWalkMaxDepth } from "../../src/toe/walkDepth.js";
import {
	collectWireEdges,
	egoSubgraph,
	formatWireEdgesText,
	hubChildrenWires,
	resolveWiresForSeed,
} from "../../src/toe/wires.js";

const fixtureRoot = fileURLToPath(
	new URL("../fixtures/toe-expand-mini/project.toe.dir", import.meta.url),
);

vi.mock("../../src/toe/expandCache.js", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../src/toe/expandCache.js")>();
	return {
		...actual,
		ensureExpandedToe: vi.fn(async (params: { toePath: string }) => {
			if (params.toePath === "__fixture__") {
				return {
					build: "2025.0",
					cacheDir: fixtureRoot,
					cacheHit: true,
					cacheKey: "fixture",
					expandDir: fixtureRoot,
					tocPath: join(fixtureRoot, "..", "project.toe.toc"),
					toePath: params.toePath,
					warnings: [],
				};
			}
			return actual.ensureExpandedToe(params);
		}),
	};
});

describe("resolveWalkMaxDepth", () => {
	it("keeps absolute depth without path", () => {
		expect(resolveWalkMaxDepth(undefined, 3).walkMaxDepth).toBe(3);
		expect(resolveWalkMaxDepth(undefined, 3).relativeToPath).toBe(false);
	});

	it("treats maxDepth as levels below path", () => {
		const r = resolveWalkMaxDepth("project1", 1);
		expect(r.pathDepth).toBe(1);
		expect(r.walkMaxDepth).toBe(2);
		expect(r.relativeToPath).toBe(true);
	});

	it("relativeDepth overrides maxDepth when path set", () => {
		const r = resolveWalkMaxDepth("project1/fx", 9, 1);
		expect(r.pathDepth).toBe(2);
		expect(r.walkMaxDepth).toBe(3);
	});
});

describe("collectOutlineEntries (L0+L1 fixture)", () => {
	it("lists dirs and .n nodes with opHints", () => {
		const entries = collectOutlineEntries(fixtureRoot, undefined, 3);
		const paths = entries.map((e) => e.relPath);
		expect(paths).toContain("project1");
		expect(paths).toContain("project1/mcp_webserver_base");
		expect(paths).toContain("project1/tdmcp_port_onstart");
		expect(paths).not.toContain("project1/tdmcp_port_onstart.parm");

		const onstart = entries.find(
			(e) => e.relPath === "project1/tdmcp_port_onstart",
		);
		expect(onstart?.kind).toBe("node");
		expect(onstart?.opHint).toBe("DAT:execute");

		const mcp = entries.find(
			(e) => e.relPath === "project1/mcp_webserver_base",
		);
		expect(mcp?.kind).toBe("dir");
		expect(mcp?.opHint).toBe("COMP:base");
	});

	it("filters to project1 subtree", () => {
		const entries = collectOutlineEntries(fixtureRoot, "project1", 3);
		expect(entries.every((e) => e.relPath.startsWith("project1"))).toBe(true);
		expect(entries.some((e) => e.relPath === "local")).toBe(false);
	});

	it("respects absolute maxDepth without path", () => {
		const shallow = collectOutlineEntries(fixtureRoot, undefined, 1);
		expect(
			shallow.every((e) => e.relPath.split("/").filter(Boolean).length <= 1),
		).toBe(true);
	});

	it("maxDepth relative to path lists immediate children", () => {
		const entries = collectOutlineEntries(fixtureRoot, "project1", 1);
		const paths = entries.map((e) => e.relPath);
		expect(paths).toContain("project1");
		expect(paths).toContain("project1/blur1");
		expect(paths).toContain("project1/fx");
		expect(paths.some((p) => p.startsWith("project1/fx/"))).toBe(false);
	});
});

describe("ego wires + hub wires + refs (fixture)", () => {
	it("egoSubgraph keeps only local edges", () => {
		const edges = collectWireEdges(fixtureRoot, "project1", 4);
		const ego = egoSubgraph(edges, "project1/blur1", 1);
		const text = ego
			.map((e) => (e.kind === "op" ? `${e.fromName}->${e.to}` : e.to))
			.join(" ");
		expect(text).toMatch(/blur1|noise1|null_out/);
		expect(ego.length).toBeGreaterThan(0);
		expect(ego.length).toBeLessThanOrEqual(edges.length);
	});

	it("hubChildrenWires returns children edges for project1", () => {
		const hub = hubChildrenWires(fixtureRoot, "project1");
		expect(hub.length).toBeGreaterThan(0);
		const text = formatWireEdgesText(hub, 80, 6000).text;
		expect(text).toMatch(/noise1.*blur1|blur1/);
		expect(text).toMatch(/# select top/);
	});

	it("resolveWiresForSeed falls back to hub children when ego empty", () => {
		const scoped = collectWireEdges(fixtureRoot, "project1", 8);
		const ego = egoSubgraph(scoped, "project1", 1);
		expect(ego.length).toBe(0);
		const resolved = resolveWiresForSeed(fixtureRoot, scoped, "project1", 1);
		expect(resolved.length).toBeGreaterThan(0);
	});

	it("refs opOnly drops pure parent/me math when only expr", () => {
		const all = collectRefs(fixtureRoot, "project1", 4, "all");
		const opOnly = collectRefs(fixtureRoot, "project1", 4, "opOnly");
		expect(opOnly.every((h) => h.kind !== "expr")).toBe(true);
		expect(
			opOnly.some((h) => h.kind === "op" || h.kind === "externaltox"),
		).toBe(true);
		expect(all.length).toBeGreaterThanOrEqual(opOnly.length);
	});

	it("resolveUnderExpand rejects ..", () => {
		expect(() => resolveUnderExpand(fixtureRoot, "../escape.n")).toThrow(
			/escape/,
		);
	});
});

describe("COMP Python Ext inventory (fixture)", () => {
	it("collectCompExtensions finds local + shortcut Exts", () => {
		const { extensions, summary } = collectCompExtensions(fixtureRoot);
		expect(summary.uniqueExts).toBeGreaterThanOrEqual(2);
		expect(summary.byKind.local).toBeGreaterThanOrEqual(1);
		expect(summary.byKind.shortcut).toBeGreaterThanOrEqual(1);
		const fx = extensions.find((e) => e.name === "FxExt");
		expect(fx?.kind).toBe("local");
		expect(fx?.hostPath).toBe("project1/fx");
		expect(fx?.sourceTextRel).toMatch(/fx_ext\.text$/);
		const ann = extensions.find((e) => e.objectExpr.includes("TDAnnotate"));
		expect(ann?.kind).toBe("shortcut");
	});
});

describe("getToeDigest live expand", () => {
	const toeexpand = tryFindToeexpand();
	const templateToe = fileURLToPath(
		new URL("../../templates/mcp_project/project.toe", import.meta.url),
	);

	it.skipIf(!toeexpand)(
		"stats + outline + cache hit on mcp_project template",
		async () => {
			const stats = await getToeDigest({
				mode: "stats",
				refresh: true,
				toePath: templateToe,
			});
			expect(stats.mode).toBe("stats");
			if (stats.mode !== "stats") return;
			expect(stats.build).toBeTruthy();
			expect(stats.fileCount).toBeGreaterThan(5);
			expect(stats.topLevel).toContain("project1");
			expect(stats.byFamily).toBeTruthy();
			expect(stats.extensionsSummary).toBeTruthy();
			expect(stats.expand.expandDir).toBeTruthy();
			expect(existsSync(stats.expand.expandDir)).toBe(true);
			expect(stats.cacheHit).toBe(false);

			const outline = await getToeDigest({
				maxDepth: 2,
				mode: "outline",
				path: "project1",
				toePath: templateToe,
			});
			expect(outline.mode).toBe("outline");
			if (outline.mode !== "outline") return;
			expect(outline.cacheHit).toBe(true);
			expect(outline.expand.cacheKey).toBe(stats.expand.cacheKey);
			expect(outline.outline).toContain("mcp_webserver_base");
			expect(outline.outline.length).toBeLessThanOrEqual(6000);
			expect(outline.truncated).toBeTypeOf("boolean");
		},
		60_000,
	);

	it.skipIf(!toeexpand)(
		"concurrent ensureExpandedToe shares one expand",
		async () => {
			_resetExpandInflightForTests();
			const [a, b] = await Promise.all([
				ensureExpandedToe({ refresh: true, toePath: templateToe }),
				ensureExpandedToe({ toePath: templateToe }),
			]);
			expect(a.expandDir).toBe(b.expandDir);
			expect(a.cacheKey).toBe(b.cacheKey);
			expect(existsSync(a.expandDir)).toBe(true);
		},
		60_000,
	);

	it.skipIf(!toeexpand)(
		"does not expand beside a copy in a disposable dir (source stay clean)",
		async () => {
			const dir = mkdtempSync(join(tmpdir(), "tdmcp-toe-src-"));
			const copy = join(dir, "project.toe");
			const { cpSync, readdirSync, readFileSync } = await import("node:fs");
			cpSync(templateToe, copy);
			await ensureExpandedToe({ refresh: true, toePath: copy });
			const beside = readdirSync(dir);
			expect(beside).toEqual(["project.toe"]);
			expect(readFileSync(copy).length).toBeGreaterThan(0);
		},
		60_000,
	);

	it.skipIf(!toeexpand)(
		"get_toe_node deep returns expand + raw.n",
		async () => {
			const node = await getToeNode({
				path: "project1/tdmcp_port_onstart",
				profile: "deep",
				toePath: templateToe,
			});
			expect(node.expand.expandDir).toBeTruthy();
			expect(node.suggestedOpPath).toBe("/project1/tdmcp_port_onstart");
			expect(node.raw?.n?.body).toMatch(/^DAT:execute/);
			expect(node.files?.some((f) => f.kind === "n")).toBe(true);
		},
		60_000,
	);

	it("errors clearly on missing toe", async () => {
		await expect(
			getToeDigest({
				mode: "stats",
				toePath: "C:/nonexistent/nope.toe",
			}),
		).rejects.toThrow(/not found/i);
	});
});

describe("fixture smoke without toeexpand", () => {
	it("can write a tiny expand dir for documentation", () => {
		const dir = mkdtempSync(join(tmpdir(), "tdmcp-outline-"));
		mkdirSync(join(dir, "project1"), { recursive: true });
		writeFileSync(join(dir, "project1", "null1.n"), "TOP:null\nend\n");
		const entries = collectOutlineEntries(dir, "project1", 2);
		expect(entries.some((e) => e.relPath === "project1/null1")).toBe(true);
	});

	it("get_toe_node deep returns children + extension + meta.cookOff", async () => {
		const node = await getToeNode({
			path: "project1/fx",
			profile: "deep",
			toePath: "__fixture__",
		});
		expect(node.extension?.slots.some((s) => s.name === "FxExt")).toBe(true);
		expect(node.meta?.cookOff).toBe(true);
		expect(node.children?.some((c) => c.relPath.includes("project1/fx/"))).toBe(
			true,
		);
		expect(node.wires !== undefined).toBe(true);
	});
});

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectOutlineEntries, getToeDigest } from "../../src/toe/digest.js";
import { ensureExpandedToe } from "../../src/toe/expandCache.js";
import { tryFindToeexpand } from "../../src/toe/toeTools.js";

const fixtureRoot = fileURLToPath(
	new URL("../fixtures/toe-expand-mini/project.toe.dir", import.meta.url),
);

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

	it("respects maxDepth", () => {
		const shallow = collectOutlineEntries(fixtureRoot, undefined, 1);
		expect(
			shallow.every((e) => e.relPath.split("/").filter(Boolean).length <= 1),
		).toBe(true);
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
			expect(outline.outline).toContain("mcp_webserver_base");
			expect(outline.outline.length).toBeLessThanOrEqual(6000);
			expect(outline.truncated).toBeTypeOf("boolean");
		},
		60_000,
	);

	it.skipIf(!toeexpand)(
		"does not expand beside a copy in a disposable dir (source stay clean)",
		async () => {
			const dir = mkdtempSync(join(tmpdir(), "tdmcp-toe-src-"));
			const copy = join(dir, "project.toe");
			const { readFileSync, cpSync, readdirSync } = await import("node:fs");
			cpSync(templateToe, copy);
			await ensureExpandedToe({ refresh: true, toePath: copy });
			const beside = readdirSync(dir);
			expect(beside).toEqual(["project.toe"]);
			expect(readFileSync(copy).length).toBeGreaterThan(0);
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
});

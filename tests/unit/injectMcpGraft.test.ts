import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	dedupeToc,
	detectBridgeConflict,
	detectNewline,
	findDuplicateTocLines,
	inspectToeBuild,
	mergeTocEntries,
	nodeNameFromEntry,
	patchBridgePortParm,
	patchExternalToxParm,
	removeTocLines,
	wipeGraftOwned,
} from "../../src/toe/graftManifest.js";

const temps: string[] = [];

function tempDir(): string {
	const d = mkdtempSync(join(tmpdir(), "tdmcp-graft-"));
	temps.push(d);
	return d;
}

afterEach(() => {
	for (const d of temps.splice(0)) {
		rmSync(d, { force: true, recursive: true });
	}
});

describe("detectNewline / mergeTocEntries", () => {
	it("preserves CRLF when appending", () => {
		const dir = tempDir();
		const toc = join(dir, "x.toc");
		writeFileSync(toc, ".build\r\nproject1.n\r\n", "utf8");
		expect(detectNewline(readFileSync(toc, "utf8"))).toBe("\r\n");
		const { added } = mergeTocEntries(toc, [
			"project1/mcp_webserver_base.n",
			"project1.n",
		]);
		expect(added).toEqual(["project1/mcp_webserver_base.n"]);
		const text = readFileSync(toc, "utf8");
		expect(text).toContain("\r\n");
		expect(text).toContain("project1/mcp_webserver_base.n");
		expect(text.split(/\r?\n/).filter((l) => l === "project1.n")).toHaveLength(
			1,
		);
	});

	it("preserves LF when appending", () => {
		const dir = tempDir();
		const toc = join(dir, "x.toc");
		writeFileSync(toc, ".build\nproject1.n\n", "utf8");
		mergeTocEntries(toc, ["project1/tdmcp_port_onstart.n"]);
		const text = readFileSync(toc, "utf8");
		expect(text.includes("\r\n")).toBe(false);
		expect(text).toContain("project1/tdmcp_port_onstart.n\n");
	});

	it("removeTocLines drops graft-owned entries", () => {
		const dir = tempDir();
		const toc = join(dir, "x.toc");
		writeFileSync(
			toc,
			[".build", "project1.n", "project1/mcp_webserver_base.n", "project1/blur1.n"].join(
				"\n",
			) + "\n",
			"utf8",
		);
		removeTocLines(toc, (line) => line.startsWith("project1/mcp_webserver_base"));
		const text = readFileSync(toc, "utf8");
		expect(text).not.toContain("mcp_webserver_base");
		expect(text).toContain("project1/blur1.n");
	});
});

describe("detectBridgeConflict", () => {
	const manifest = [
		"project1/tdmcp_bridge.n",
		"project1/tdmcp_bridge.parm",
		"project1/tdmcp_port_onstart.n",
		"project1/tdmcp_port_onstart.parm",
		"project1/tdmcp_port_onstart.text",
	];

	it("reports absent when no bridge", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1"), { recursive: true });
		writeFileSync(join(dir, "project1", "blur1.n"), "TOP:blur\nend\n");
		const c = detectBridgeConflict(dir, manifest);
		expect(c.state).toBe("absent");
		expect(c.missingManifestPaths).toHaveLength(manifest.length);
	});

	it("reports full when stems + manifest present", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1", "tdmcp_bridge"), { recursive: true });
		for (const rel of manifest) {
			const abs = join(dir, ...rel.split("/"));
			mkdirSync(join(abs, ".."), { recursive: true });
			writeFileSync(abs, "x\n");
		}
		const c = detectBridgeConflict(dir, manifest);
		expect(c.state).toBe("full");
		expect(c.missingManifestPaths).toEqual([]);
	});

	it("reports partial when only onStart exists", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1"), { recursive: true });
		writeFileSync(join(dir, "project1", "tdmcp_port_onstart.n"), "DAT:execute\nend\n");
		const c = detectBridgeConflict(dir, manifest);
		expect(c.state).toBe("partial");
	});

	it("reports full for onStart + modules tox (runtime inject)", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1"), { recursive: true });
		mkdirSync(join(dir, "modules"), { recursive: true });
		for (const rel of [
			"project1/tdmcp_port_onstart.n",
			"project1/tdmcp_port_onstart.parm",
			"project1/tdmcp_port_onstart.text",
		]) {
			writeFileSync(join(dir, ...rel.split("/")), "x\n");
		}
		writeFileSync(join(dir, "modules", "tdmcp_bridge.tox"), "tox\n");
		const c = detectBridgeConflict(dir, manifest, dir);
		expect(c.state).toBe("full");
	});

	it("full with extras under stem still full", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1", "tdmcp_bridge"), { recursive: true });
		for (const rel of manifest) {
			const abs = join(dir, ...rel.split("/"));
			mkdirSync(join(abs, ".."), { recursive: true });
			writeFileSync(abs, "x\n");
		}
		writeFileSync(
			join(dir, "project1", "tdmcp_bridge", "extra.text"),
			"extra\n",
		);
		const c = detectBridgeConflict(dir, manifest);
		expect(c.state).toBe("full");
		expect(c.extraUnderStem).toContain("project1/tdmcp_bridge/extra.text");
	});
});

describe("patchExternalToxParm", () => {
	it("inserts externaltox after enableexternaltox", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1"), { recursive: true });
		const parm = join(dir, "project1", "tdmcp_bridge.parm");
		writeFileSync(
			parm,
			"?\npageindex 0 3\nenableexternaltox 0 off\nPort 67108928 9981\n?\n",
			"utf8",
		);
		patchExternalToxParm(dir);
		const body = readFileSync(parm, "utf8");
		expect(body).toMatch(/^externaltox 17 "" ""$/m);
		expect(body).toContain("enableexternaltox 0 off");
	});

	it("replaces existing externaltox line", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1"), { recursive: true });
		const parm = join(dir, "project1", "tdmcp_bridge.parm");
		writeFileSync(
			parm,
			'?\nenableexternaltox 0 off\nexternaltox 0 old.tox\n?\n',
			"utf8",
		);
		patchExternalToxParm(dir);
		const body = readFileSync(parm, "utf8");
		expect(body).not.toContain("old.tox");
		expect(body).toMatch(/^externaltox 17 "" ""$/m);
		expect(existsSync(parm)).toBe(true);
	});
});

describe("inspectToeBuild tox collisions", () => {
	it("flags mcp_webserver_base.tox beside embedded COMP", () => {
		const dir = tempDir();
		const expand = join(dir, "expand");
		mkdirSync(join(expand, "project1", "mcp_webserver_base"), {
			recursive: true,
		});
		writeFileSync(join(expand, "project1", "mcp_webserver_base.n"), "x");
		writeFileSync(join(dir, "mcp_webserver_base.tox"), "tox");
		writeFileSync(join(dir, "project.toe.toc"), "project1/mcp_webserver_base.n\n");
		const report = inspectToeBuild({
			expandDir: expand,
			projectDir: dir,
			tocPath: join(dir, "project.toe.toc"),
		});
		expect(report.ok).toBe(false);
		expect(report.toxCollisions.length).toBe(1);
		expect(report.errors[0]).toMatch(/TOX_NAME_COLLISION/);
	});

	it("allows tdmcp_bridge.tox sidecar", () => {
		const dir = tempDir();
		const expand = join(dir, "expand");
		mkdirSync(join(expand, "project1", "mcp_webserver_base"), {
			recursive: true,
		});
		writeFileSync(join(expand, "project1", "mcp_webserver_base.n"), "x");
		writeFileSync(join(dir, "tdmcp_bridge.tox"), "tox");
		writeFileSync(join(dir, "project.toe.toc"), "project1/mcp_webserver_base.n\n");
		const report = inspectToeBuild({
			expandDir: expand,
			projectDir: dir,
			tocPath: join(dir, "project.toe.toc"),
		});
		expect(report.ok).toBe(true);
		expect(report.toxCollisions).toEqual([]);
	});
});

describe("toc dedupe / wipe", () => {
	it("dedupeToc removes duplicate lines", () => {
		const dir = tempDir();
		const toc = join(dir, "x.toc");
		writeFileSync(
			toc,
			[".build", "project1.n", "project1/mcp_webserver_base.n", "project1/mcp_webserver_base.n", "project1.n"].join(
				"\n",
			) + "\n",
			"utf8",
		);
		const { removed } = dedupeToc(toc);
		expect(removed).toBe(2);
		expect(findDuplicateTocLines(toc)).toEqual([]);
		const lines = readFileSync(toc, "utf8")
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		expect(lines.filter((l) => l === "project1.n")).toHaveLength(1);
	});

	it("wipeGraftOwned removes case-variant bridge names", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1"), { recursive: true });
		writeFileSync(join(dir, "project1", "MCP_webserver_base.n"), "COMP:base\nend\n");
		writeFileSync(join(dir, "project1", "blur1.n"), "TOP:blur\nend\n");
		const toc = join(dir, "x.toc");
		writeFileSync(
			toc,
			"project1/MCP_webserver_base.n\nproject1/blur1.n\n",
			"utf8",
		);
		wipeGraftOwned(dir, toc, ["project1/mcp_webserver_base.n"]);
		expect(existsSync(join(dir, "project1", "MCP_webserver_base.n"))).toBe(
			false,
		);
		expect(existsSync(join(dir, "project1", "blur1.n"))).toBe(true);
		expect(readFileSync(toc, "utf8")).not.toMatch(/mcp_webserver_base/i);
	});

	it("nodeNameFromEntry strips extensions", () => {
		expect(nodeNameFromEntry("mcp_webserver_base.n")).toBe("mcp_webserver_base");
		expect(nodeNameFromEntry("mcp_webserver_base")).toBe("mcp_webserver_base");
	});
});

describe("patchBridgePortParm", () => {
	it("rewrites Port line to owned port", () => {
		const dir = tempDir();
		mkdirSync(join(dir, "project1"), { recursive: true });
		const parm = join(dir, "project1", "tdmcp_bridge.parm");
		writeFileSync(
			parm,
			"?\nenableexternaltox 0 off\nPort 67108928 9981\n?\n",
			"utf8",
		);
		patchBridgePortParm(dir, 9987);
		const body = readFileSync(parm, "utf8");
		expect(body).toMatch(/^Port 67108928 9987$/m);
		expect(body).not.toMatch(/9981/);
	});
});

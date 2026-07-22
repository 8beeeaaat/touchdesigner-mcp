#!/usr/bin/env node
/**
 * Slice A2 regression helper (direct imports — no MCP reload required).
 * Still requires human judgment for outline usefulness (see docs/toe-digest.md §E2E).
 *
 * Usage: node ./scripts/toeDigestE2E.mjs
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getToeDigest } from "../dist/toe/digest.js";
import { tryFindToeexpand } from "../dist/toe/toeTools.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const templateToe = join(root, "templates/mcp_project/project.toe");
const gestationToe = join(
	root,
	"../../docs/td-technics/raw/derivative.ca/community/asset/75049_gestation-digital-lifeform-touchdesigner---project-file/downloads/Gestation.toe",
);

function assert(cond, msg) {
	if (!cond) throw new Error(msg);
}

async function caseT() {
	console.log("\n=== Case T: template ===");
	const stats = await getToeDigest({
		mode: "stats",
		refresh: true,
		toePath: templateToe,
	});
	assert(stats.mode === "stats", "expected stats");
	assert(stats.build, "expected build");
	assert(stats.topLevel.includes("project1"), "expected project1 in topLevel");
	console.log("stats ok", {
		build: stats.build,
		fileCount: stats.fileCount,
		cacheHit: stats.cacheHit,
	});

	const outline = await getToeDigest({
		maxDepth: 2,
		mode: "outline",
		path: "project1",
		toePath: templateToe,
	});
	assert(outline.mode === "outline", "expected outline");
	assert(outline.cacheHit === true, "expected cache hit");
	assert(
		outline.outline.includes("mcp_webserver_base"),
		"expected mcp_webserver_base in outline",
	);
	assert(outline.outline.length <= 6000, "outline over maxChars default");
	console.log("outline excerpt:\n", outline.outline.split("\n").slice(0, 25).join("\n"));
	console.log("USER JUDGMENT Case T: is this outline useful? (yes/no)");
}

async function caseG() {
	console.log("\n=== Case G: Gestation ===");
	if (!existsSync(gestationToe)) {
		console.log("SKIP: Gestation.toe not found at", gestationToe);
		return;
	}
	const besideBefore = new Set(readdirSync(dirname(gestationToe)));
	const stats = await getToeDigest({
		mode: "stats",
		toePath: gestationToe,
	});
	assert(stats.mode === "stats", "expected stats");
	assert(stats.fileCount > 0, "expected files");
	const outline = await getToeDigest({
		maxDepth: 2,
		mode: "outline",
		path: "project1",
		toePath: gestationToe,
	});
	assert(outline.mode === "outline", "expected outline");
	assert(outline.outline.length > 10, "empty outline");
	const besideAfter = readdirSync(dirname(gestationToe));
	for (const name of besideAfter) {
		if (name.endsWith(".toc") || name.endsWith(".dir")) {
			assert(
				besideBefore.has(name),
				`raw/ polluted with new ${name}`,
			);
		}
	}
	console.log("stats ok", {
		build: stats.build,
		fileCount: stats.fileCount,
		cacheHit: stats.cacheHit,
	});
	console.log("outline excerpt:\n", outline.outline.split("\n").slice(0, 40).join("\n"));
	console.log("USER JUDGMENT Case G: is this outline useful? (yes/no)");
}

async function caseN() {
	console.log("\n=== Case N: missing ===");
	let threw = false;
	try {
		await getToeDigest({
			mode: "stats",
			toePath: "C:/nonexistent/nope.toe",
		});
	} catch (e) {
		threw = true;
		console.log("error ok:", e instanceof Error ? e.message : e);
	}
	assert(threw, "expected error for missing toe");
}

async function main() {
	const bin = tryFindToeexpand();
	if (!bin) {
		console.error("FAIL: toeexpand not found");
		process.exit(1);
	}
	console.log("toeexpand:", bin);
	await caseT();
	await caseG();
	await caseN();
	console.log("\n=== Automated asserts passed ===");
	console.log(
		"Complete human gates in docs/toe-digest.md §E2E (MCP reload + usefulness yes/no).",
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

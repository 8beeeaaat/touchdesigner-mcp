#!/usr/bin/env node
/**
 * Optional disk smoke (not MCP): expand template toe if toeexpand is installed.
 * Exits 0 on success, 0 with skip message if toeexpand missing, 1 on failure.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getToeDigest } from "../dist/toe/digest.js";
import { tryFindToeexpand } from "../dist/toe/toeTools.js";

const here = dirname(fileURLToPath(import.meta.url));
const templateToe = join(here, "../templates/mcp_project/project.toe");

async function main() {
	const bin = tryFindToeexpand();
	if (!bin) {
		console.log("SKIP: toeexpand not found (TouchDesigner not installed)");
		process.exit(0);
	}
	console.log("toeexpand:", bin);
	const stats = await getToeDigest({
		mode: "stats",
		refresh: true,
		toePath: templateToe,
	});
	console.log(JSON.stringify(stats, null, 2));
	const outline = await getToeDigest({
		maxDepth: 2,
		mode: "outline",
		path: "project1",
		toePath: templateToe,
	});
	if (outline.mode === "outline") {
		console.log("--- outline ---");
		console.log(outline.outline);
		console.log("cacheHit", outline.cacheHit);
	}
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

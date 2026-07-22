#!/usr/bin/env node
/**
 * Gestation replay — ≤3 tool-equivalent calls (plan Layer B).
 * npm run build && npm run test:toe-digest-replay
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getToeDigest } from "../dist/toe/digest.js";
import { getToeNode } from "../dist/toe/nodeInspect.js";
import { tryFindToeexpand } from "../dist/toe/toeTools.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const gestationToe = join(
	root,
	"../../docs/td-technics/raw/derivative.ca/community/asset/75049_gestation-digital-lifeform-touchdesigner---project-file/downloads/Gestation.toe",
);

let calls = 0;
function budget() {
	calls += 1;
	if (calls > 3) {
		throw new Error(`replay budget exceeded: ${calls} > 3`);
	}
}

function assert(cond, msg) {
	if (!cond) throw new Error(msg);
}

function looksLikeGlsl(text) {
	return /\b(void|main|uniform|vec[234]|texture)\b/i.test(text);
}

async function main() {
	const bin = tryFindToeexpand();
	if (!bin) {
		console.error("FAIL: toeexpand not found");
		process.exit(1);
	}
	if (!existsSync(gestationToe)) {
		console.error("FAIL: Gestation.toe missing at", gestationToe);
		process.exit(1);
	}

	const besideBefore = new Set(readdirSync(dirname(gestationToe)));

	budget();
	const brief = await getToeDigest({
		mode: "brief",
		path: "project1/comp_all",
		radius: 1,
		toePath: gestationToe,
	});
	assert(brief.mode === "brief", "expected brief");
	assert(brief.expand?.expandDir && existsSync(brief.expand.expandDir), "expandDir");
	assert(
		/comp_membrane_bg|comp_add_details/.test(brief.wires),
		`expected composite edges in wires, got:\n${brief.wires.slice(0, 500)}`,
	);
	console.log("call1 brief ok", {
		edgeCount: brief.edgeCount,
		nodes: brief.nodes?.length,
		files: brief.files?.length,
		expandDir: brief.expand.expandDir,
	});

	budget();
	let deepPath = "project1/membrane_frag";
	const fragFile = brief.files?.find((f) =>
		/membrane_frag\.text$/i.test(f.rel),
	);
	if (fragFile) {
		deepPath = fragFile.rel.replace(/\.text$/i, "");
	}
	const deep = await getToeNode({
		path: deepPath,
		profile: "deep",
		toePath: gestationToe,
		...(fragFile
			? { file: fragFile.rel.split("/").pop() }
			: {}),
	});
	assert(deep.expand?.expandDir, "deep expand");
	const body =
		deep.raw?.file?.body ||
		deep.raw?.text?.body ||
		deep.raw?.n?.body ||
		"";
	assert(
		looksLikeGlsl(body) || /membrane|frag|vert/i.test(body),
		`expected shader-like body for ${deepPath}, got ${body.slice(0, 200)}`,
	);
	console.log("call2 deep ok", {
		path: deep.path,
		suggestedOpPath: deep.suggestedOpPath,
		bodyPreview: body.slice(0, 120).replace(/\s+/g, " "),
	});

	const besideAfter = readdirSync(dirname(gestationToe));
	for (const name of besideAfter) {
		if (name.endsWith(".toc") || name.endsWith(".dir")) {
			assert(besideBefore.has(name), `raw/ polluted with ${name}`);
		}
	}

	console.log(`\nPASS replay in ${calls} calls (budget 3)`);
	console.log(
		"Human gate: Could you follow membrane → comp without guessing temp paths? (yes/no)",
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

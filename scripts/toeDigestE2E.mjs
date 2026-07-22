#!/usr/bin/env node
/**
 * ToeDigest e2e (direct imports). Usage: npm run test:toe-digest-e2e
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getToeDigest } from "../dist/toe/digest.js";
import { getToeNode } from "../dist/toe/nodeInspect.js";
import { tryFindToeexpand } from "../dist/toe/toeTools.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const templateToe = join(root, "templates/mcp_project/project.toe");
const gestationToe = join(
	root,
	"../../docs/td-technics/raw/derivative.ca/community/asset/75049_gestation-digital-lifeform-touchdesigner---project-file/downloads/Gestation.toe",
);
const chladniToe = join(
	root,
	"../../expe_baseline_chladni_3d_dots_and_arc.toe",
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
	assert(stats.topLevel.includes("project1"), "expected project1");
	const outline = await getToeDigest({
		maxDepth: 2,
		mode: "outline",
		path: "project1",
		toePath: templateToe,
	});
	assert(outline.mode === "outline" && outline.cacheHit, "outline/cache");
	assert(outline.outline.includes("mcp_webserver_base"), "mcp in outline");
	const node = await getToeNode({
		include: ["inputs", "parms", "meta"],
		path: "project1/tdmcp_port_onstart",
		toePath: templateToe,
	});
	assert(node.opHint === "DAT:execute", "onstart type");
	console.log("T ok", { build: stats.build, opHint: node.opHint });
}

async function caseG() {
	console.log("\n=== Case G: Gestation ===");
	if (!existsSync(gestationToe)) {
		console.log("SKIP: Gestation.toe missing");
		return;
	}
	const besideBefore = new Set(readdirSync(dirname(gestationToe)));
	const stats = await getToeDigest({ mode: "stats", toePath: gestationToe });
	assert(stats.fileCount > 0, "files");
	const outline = await getToeDigest({
		maxDepth: 2,
		mode: "outline",
		path: "project1",
		toePath: gestationToe,
	});
	assert(outline.outline.length > 10, "outline");
	for (const name of readdirSync(dirname(gestationToe))) {
		if (name.endsWith(".toc") || name.endsWith(".dir")) {
			assert(besideBefore.has(name), `raw polluted: ${name}`);
		}
	}
	console.log("G ok", { fileCount: stats.fileCount });
}

async function caseWiresRefs() {
	console.log("\n=== Case W: chladni wires/refs ===");
	if (!existsSync(chladniToe)) {
		console.log("SKIP: chladni toe missing");
		return;
	}
	const wires = await getToeDigest({
		maxDepth: 5,
		maxNodes: 100,
		mode: "wires",
		path: "project1/chladni3d",
		toePath: chladniToe,
	});
	assert(wires.mode === "wires", "wires mode");
	assert(wires.wires.includes("->"), "has edges");
	assert(
		/mono_low.*blur_low|blur_low.*fb_low/s.test(wires.wires),
		"expected blur chain",
	);
	const refs = await getToeDigest({
		maxDepth: 4,
		maxNodes: 40,
		mode: "refs",
		path: "project1",
		toePath: chladniToe,
	});
	assert(refs.mode === "refs", "refs mode");
	assert(refs.refCount >= 1 || refs.refs.length > 0, "some refs");
	const node = await getToeNode({
		include: ["inputs", "outputs", "parms"],
		path: "project1/chladni3d/blur_low",
		toePath: chladniToe,
	});
	assert(node.opHint === "TOP:blur", "blur type");
	assert(
		(node.inputs || []).some((i) => i.fromName === "mono_low"),
		"blur input",
	);
	console.log("W ok", {
		edgeCount: wires.edgeCount,
		refCount: refs.refCount,
		blurInputs: node.inputs,
	});
}

async function caseN() {
	console.log("\n=== Case N: missing ===");
	let threw = false;
	try {
		await getToeDigest({ mode: "stats", toePath: "C:/nonexistent/nope.toe" });
	} catch (e) {
		threw = true;
		console.log("error ok:", e instanceof Error ? e.message : e);
	}
	assert(threw, "expected error");
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
	await caseWiresRefs();
	await caseN();
	console.log("\n=== Automated asserts passed ===");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

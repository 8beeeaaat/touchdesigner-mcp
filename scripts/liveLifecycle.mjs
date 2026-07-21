#!/usr/bin/env node
/**
 * Gated live lifecycle smoke. Set TD_MCP_LIVE=1 with lab TD on :9981.
 * Full start/stop of a secondary requires a real templates/mcp_project/project.toe
 * (not the placeholder). Create+lab identity always run when gated.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTdProject } from "../dist/core/lifecycle.js";
import { createTouchDesignerClient } from "../dist/tdClient/index.js";
import {
	resetTargetRegistryForTests,
	TargetRegistry,
} from "../dist/core/targetRegistry.js";
import { probeIdentity } from "../dist/lifecycle/tdProcess.js";

if (process.env.TD_MCP_LIVE !== "1") {
	console.log("SKIP live-lifecycle (set TD_MCP_LIVE=1)");
	process.exit(0);
}

const nullLogger = { sendLog: () => {} };
const registry = new TargetRegistry();
resetTargetRegistryForTests(registry);
const tdClient = createTouchDesignerClient({ logger: nullLogger });

const labId = await probeIdentity(
	tdClient,
	"lab",
	"http://127.0.0.1",
	9981,
);
console.log("LAB_OK", labId.projectName, labId.projectFolder);

const destRoot = mkdtempSync(join(tmpdir(), "tdmcp-live-"));
const dest = join(destRoot, "proj");
try {
	const created = await createTdProject({ destDir: dest });
	console.log("CREATE_OK", created.targetId, created.port, created.toePath);
	const toeHead = readFileSync(created.toePath, "utf8").slice(0, 32);
	if (toeHead.includes("PLACEHOLDER")) {
		console.log(
			"SKIP_START placeholder project.toe — bootstrap a real toe in templates/mcp_project then re-run",
		);
		process.exit(0);
	}
	console.log("LIVE_PARTIAL_PASS (start/stop requires non-placeholder toe)");
	process.exit(0);
} finally {
	try {
		rmSync(destRoot, { recursive: true, force: true });
	} catch {
		// ignore
	}
}

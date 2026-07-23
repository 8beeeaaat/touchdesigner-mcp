#!/usr/bin/env node
/**
 * Gated live lifecycle smoke. Set TD_MCP_LIVE=1.
 * - Always exercises create_td_project (no TD required).
 * - Probes lab :9981 when available; skips start/stop if toe is placeholder or lab down.
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

let labOk = false;
try {
	const labId = await probeIdentity(
		tdClient,
		"lab",
		"http://127.0.0.1",
		9981,
	);
	console.log("LAB_OK", labId.projectName, labId.projectFolder);
	labOk = true;
} catch (err) {
	console.log(
		"LAB_SKIP",
		err instanceof Error ? err.message.split("\n")[0] : String(err),
	);
}

const destRoot = mkdtempSync(join(tmpdir(), "tdmcp-live-"));
const dest = join(destRoot, "proj");
try {
	const created = await createTdProject({ destDir: dest });
	console.log("CREATE_OK", created.targetId, created.port, created.toePath);
	const toeHead = readFileSync(created.toePath, "utf8").slice(0, 40);
	if (toeHead.includes("PLACEHOLDER")) {
		console.log("SKIP_START placeholder project.toe");
	} else if (!labOk) {
		console.log("SKIP_START lab offline (cannot dual-smoke)");
	} else {
		console.log("READY_FOR_START (manual: start_td_project then stop)");
	}
	console.log(labOk ? "LIVE_PASS_PARTIAL" : "LIVE_PASS_CREATE_ONLY");
	process.exit(0);
} catch (err) {
	console.error(err);
	process.exit(1);
} finally {
	try {
		rmSync(destRoot, { recursive: true, force: true });
	} catch {
		// ignore
	}
}

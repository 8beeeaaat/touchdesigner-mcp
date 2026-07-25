#!/usr/bin/env node
/**
 * Live E2E: tunnel create→start→TOP→hub-kill reconnect against real TD.
 * Set TD_MCP_TUNNEL_E2E=1. Requires TouchDesigner installed.
 *
 * Proves: nonce identity (vs squatters), get_top_image over /proxy, hub respawn.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTdProject } from "../dist/core/lifecycle.js";
import {
	resetTargetRegistryForTests,
	TargetRegistry,
} from "../dist/core/targetRegistry.js";
import { HubClient } from "../dist/hub/client.js";
import { ensureHub } from "../dist/hub/ensureHub.js";
import { startTdProject, stopTdProject } from "../dist/lifecycle/tdProcess.js";
import { createTouchDesignerClient } from "../dist/tdClient/index.js";
import { runWithTarget } from "../dist/core/targetContext.js";
import { execSync } from "node:child_process";

if (process.env.TD_MCP_TUNNEL_E2E !== "1") {
	console.log("SKIP tunnel E2E (set TD_MCP_TUNNEL_E2E=1)");
	process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const destRoot = mkdtempSync(join(tmpdir(), "tdmcp-tunnel-e2e-"));
const hubUrl = process.env.TDMCP_HUB_URL || "http://127.0.0.1:9980";

const nullLogger = { sendLog: () => {} };
const registry = new TargetRegistry(undefined, { seedLab: false });
resetTargetRegistryForTests(registry);
let hub = new HubClient(hubUrl);
registry.attachHub(hub);
const tdClient = createTouchDesignerClient({ logger: nullLogger });

await ensureHub({ hubUrl });
console.log("HUB_OK", hubUrl);

// Report squatters (other TD processes) — tunnel must still latch our nonce
try {
	const squat = execSync(
		`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='TouchDesigner.exe'\\" | Select-Object -ExpandProperty CommandLine"`,
		{ encoding: "utf8" },
	);
	const lines = squat
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
	console.log("SQUATTERS", lines.length, lines.slice(0, 5));
} catch {
	console.log("SQUATTERS", 0);
}

const created = await createTdProject({
	destDir: join(destRoot, "proj"),
	name: "tunnel_e2e",
});
console.log(
	"CREATED",
	created.targetId,
	created.nonce?.slice(0, 8),
	created.transport,
);

const started = await startTdProject({
	hubClient: hub,
	registry,
	tdClient,
	toePath: created.toePath,
	timeoutMs: 180_000,
});
console.log("STARTED", started.targetId, "pid=", started.pid, started.identity);

const selected = registry.getSelected();
const withSticky = (fn) => runWithTarget(registry.asOrigin(selected), fn);

const info = await withSticky(async () => {
	const r = await tdClient.getTdInfo();
	if (!r.success) throw r.error;
	return r.data;
});
console.log("GET_TD_INFO", info);

const folder = String(started.identity?.projectFolder || "")
	.replace(/\\/g, "/")
	.toLowerCase();
const expected = created.destDir.replace(/\\/g, "/").toLowerCase();
if (folder && folder !== expected && !folder.includes("tunnel_e2e")) {
	console.error("IDENTITY_MISMATCH", { folder, expected });
	process.exit(2);
}

// Build a constant TOP and capture pixels over the tunnel proxy
await withSticky(async () => {
	const script = `
parent = op('/project1')
scratch = parent.op('_agent_scratch')
if scratch is None:
	scratch = parent.create(baseCOMP, '_agent_scratch')
c = scratch.op('const_e2e')
if c is not None:
	c.destroy()
c = scratch.create(constantTOP, 'const_e2e')
c.par.colorr = 0.2
c.par.colorg = 0.6
c.par.colorb = 1.0
print(c.path)
`;
	const r = await tdClient.execPythonScript({ script });
	if (!r.success) throw r.error;
});

const { buildGetTopImageScript } = await import(
	"../dist/features/tools/pythonScripts/getTopImageScript.js"
);
const topImg = await withSticky(async () => {
	const script = buildGetTopImageScript({
		nodePath: "/project1/_agent_scratch/const_e2e",
		maxSize: 256,
	});
	const r = await tdClient.execPythonScript({ script });
	if (!r.success) throw r.error;
	return r.data;
});
const payload =
	topImg && typeof topImg === "object" && "result" in topImg
		? topImg.result
		: topImg;
const imgBytes =
	typeof payload === "string"
		? payload.length
		: typeof payload === "object" && payload && "byteLength" in payload
			? payload.byteLength
			: JSON.stringify(payload ?? "").length;
console.log("TOP_IMAGE_OK bytes~", imgBytes);
if (!imgBytes || imgBytes < 100) {
	console.error("TOP_IMAGE_TOO_SMALL", imgBytes, typeof payload);
	process.exit(3);
}

// Hub kill → ensureHub → wait for TD tunnel reconnect → get_td_info again
const healthBefore = await hub.health();
console.log("HEALTH_BEFORE", healthBefore);

try {
	execSync(
		`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'dist[\\\\/]hub\\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`,
		{ stdio: "ignore" },
	);
} catch {
	/* ignore */
}
await sleep(1500);
await ensureHub({ hubUrl, hubDir: process.env.TDMCP_HUB_DIR });
hub = new HubClient(hubUrl);
registry.attachHub(hub);
console.log("HUB_RESPAWNED");

// Re-expect so reconnect hello is accepted (nonce still in state.json)
await hub.expectPeer({
	id: created.targetId,
	nonce: created.nonce,
	projectDir: created.destDir,
	toePath: created.toePath,
	label: created.target.label,
});

let reconnected = false;
for (let i = 0; i < 60; i++) {
	const st = await hub.peerConnected(created.targetId);
	if (st.connected) {
		reconnected = true;
		break;
	}
	await sleep(1000);
}
console.log("RECONNECTED", reconnected);
if (!reconnected) {
	console.error("TUNNEL_RECONNECT_TIMEOUT");
	process.exit(4);
}

await registry.selectAsync(created.targetId);
const info2 = await runWithTarget(
	registry.asOrigin(registry.getSelected()),
	async () => {
		const r = await tdClient.getTdInfo();
		if (!r.success) throw r.error;
		return r.data;
	},
);
console.log("GET_TD_INFO_AFTER_HUB_KILL", info2);

const stopPid = started.pid;
await stopTdProject({
	registry,
	tdClient,
	targetId: created.targetId,
});
console.log("STOPPED", created.targetId, "was_pid=", stopPid);

writeFileSync(
	join(destRoot, "result.json"),
	JSON.stringify(
		{ created, started, info, info2, imgBytes, reconnected },
		null,
		2,
	),
);
console.log("PASS tunnel E2E", destRoot);

if (process.env.CLEAN === "1") {
	try {
		rmSync(destRoot, { force: true, recursive: true });
	} catch (e) {
		console.warn("CLEAN skipped:", e?.message || e);
	}
}

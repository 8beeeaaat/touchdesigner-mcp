#!/usr/bin/env node
/**
 * Live E2E: tunnel create→start→TOP→status face→hub-kill reconnect against real TD.
 * Set TD_MCP_TUNNEL_E2E=1. Requires TouchDesigner installed.
 *
 * Proves: nonce identity, get_top_image over /proxy, bridge status face + history cap,
 * hub respawn.
 */
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "docs", "assets", "bridge-status");

const destRoot = mkdtempSync(join(tmpdir(), "tdmcp-tunnel-e2e-"));
const hubUrl = process.env.TDMCP_HUB_URL || "http://127.0.0.1:9980";

const nullLogger = { sendLog: () => {} };
const registry = new TargetRegistry(undefined, { seedLab: false });
resetTargetRegistryForTests(registry);
let hub = new HubClient(hubUrl);
registry.attachHub(hub);
const tdClient = createTouchDesignerClient({ logger: nullLogger });

const { buildGetTopImageScript } = await import(
	"../dist/features/tools/pythonScripts/getTopImageScript.js"
);

function extractResult(data) {
	if (data && typeof data === "object" && "result" in data) return data.result;
	return data;
}

function b64ToBuffer(b64) {
	const s = typeof b64 === "string" ? b64 : "";
	const clean = s.replace(/^data:image\/\w+;base64,/, "");
	return Buffer.from(clean, "base64");
}

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

async function captureTopPng(nodePath, outFile) {
	const data = await withSticky(async () => {
		const script = `
import base64
import td
node = op(${JSON.stringify(nodePath)})
if node is None:
	raise Exception('missing ' + ${JSON.stringify(nodePath)})
ba = node.saveByteArray('.png')
if not ba:
	raise Exception('empty png')
result = base64.b64encode(bytes(ba)).decode('ascii')
`;
		const r = await tdClient.execPythonScript({ script });
		if (!r.success) throw r.error;
		return r.data;
	});
	const payload = extractResult(data);
	const buf = b64ToBuffer(payload);
	if (buf.length < 200) {
		throw new Error(`TOP capture too small for ${nodePath}: ${buf.length}`);
	}
	// PNG magic
	if (buf[0] !== 0x89 || buf[1] !== 0x50) {
		console.warn("WARN capture not PNG magic", outFile);
	}
	mkdirSync(ASSETS, { recursive: true });
	writeFileSync(outFile, buf);
	console.log("WROTE", outFile, "bytes", buf.length);
	return buf.length;
}

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

// Let onFrameStart flush status UI
await sleep(1500);

const statusProbe = await withSticky(async () => {
	const script = `
from utils import tdmcp_status
tdmcp_status.flush(force=True)
bridge = op('/project1/tdmcp_bridge')
txt = bridge.op('status_text') if bridge else None
log = bridge.op('event_log') if bridge else None
top = bridge.op('status_top') if bridge else None
result = {
	'hasBridge': bridge is not None,
	'hasText': txt is not None,
	'hasLog': log is not None,
	'hasTop': top is not None,
	'text': (txt.text if txt is not None else '') or '',
	'logRows': int(log.numRows) if log is not None else 0,
	'opviewer': str(getattr(bridge.par, 'opviewer', '')),
	'viewer': bool(getattr(bridge, 'viewer', False)),
}
`;
	const r = await tdClient.execPythonScript({ script });
	if (!r.success) throw r.error;
	return extractResult(r.data);
});
console.log("STATUS_PROBE", statusProbe);
const statusText = String(statusProbe?.text || "");
if (!/connected/i.test(statusText)) {
	console.error("STATUS_NOT_CONNECTED", statusText);
	process.exit(5);
}
if (!statusText.includes(created.targetId) && !statusText.includes("owned-")) {
	console.error("STATUS_MISSING_TARGET", statusText);
	process.exit(5);
}
if (!statusProbe?.hasTop || !statusProbe?.viewer) {
	console.error("STATUS_VIEWER_NOT_SET", statusProbe);
	process.exit(5);
}

await captureTopPng(
	"/project1/tdmcp_bridge/status_top",
	join(ASSETS, "status-connected.png"),
);

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

await sleep(800);

const afterOp = await withSticky(async () => {
	const script = `
from utils import tdmcp_status
tdmcp_status.flush(force=True)
bridge = op('/project1/tdmcp_bridge')
txt = bridge.op('status_text')
log = bridge.op('event_log')
result = {
	'text': (txt.text if txt else '') or '',
	'logRows': int(log.numRows) if log else 0,
	'requests': int(tdmcp_status.request_count()),
}
`;
	const r = await tdClient.execPythonScript({ script });
	if (!r.success) throw r.error;
	return extractResult(r.data);
});
console.log("AFTER_OP", afterOp);
if (!afterOp?.logRows || afterOp.logRows < 2) {
	console.error("EVENT_LOG_EMPTY", afterOp);
	process.exit(6);
}
if (!afterOp?.requests || afterOp.requests < 1) {
	console.error("REQUEST_COUNT_ZERO", afterOp);
	process.exit(6);
}

await captureTopPng(
	"/project1/tdmcp_bridge/status_top",
	join(ASSETS, "status-after-op.png"),
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
const payload = extractResult(topImg);
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

// History cap proof
const capProof = await withSticky(async () => {
	const script = `
from utils import tdmcp_status
n = tdmcp_status.flood_for_test(tdmcp_status.MAX_EVENTS + 40)
tdmcp_status.flush(force=True)
log = op('/project1/tdmcp_bridge/event_log')
result = {
	'dequeLen': int(tdmcp_status.deque_len()),
	'maxEvents': int(tdmcp_status.MAX_EVENTS),
	'logRows': int(log.numRows) if log else -1,
}
`;
	const r = await tdClient.execPythonScript({ script });
	if (!r.success) throw r.error;
	return extractResult(r.data);
});
console.log("CAP_PROOF", capProof);
if (capProof.dequeLen > capProof.maxEvents) {
	console.error("DEQUE_OVER_CAP", capProof);
	process.exit(7);
}
if (capProof.logRows > capProof.maxEvents + 1) {
	console.error("TABLE_OVER_CAP", capProof);
	process.exit(7);
}

writeFileSync(
	join(ASSETS, "status-e2e-notes.md"),
	[
		"# Bridge status E2E notes",
		"",
		`- targetId: \`${created.targetId}\``,
		`- status_text (connected):`,
		"```",
		statusText,
		"```",
		`- after-op requests=${afterOp.requests} logRows=${afterOp.logRows}`,
		`- cap: deque=${capProof.dequeLen} logRows=${capProof.logRows} max=${capProof.maxEvents}`,
		"",
	].join("\n"),
);

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
		{
			created,
			started,
			info,
			info2,
			imgBytes,
			reconnected,
			statusProbe,
			afterOp,
			capProof,
		},
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

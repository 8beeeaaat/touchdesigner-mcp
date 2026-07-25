#!/usr/bin/env node
/**
 * Live demo: build a visible TOP network (NOT _agent_scratch) while the
 * bridge status face ticks. Uses hub /proxy directly.
 */
import { HubClient } from "../dist/hub/client.js";
import { ensureHub } from "../dist/hub/ensureHub.js";
import {
	TargetRegistry,
	resetTargetRegistryForTests,
} from "../dist/core/targetRegistry.js";
import { createTouchDesignerClient } from "../dist/tdClient/index.js";
import { runWithTarget } from "../dist/core/targetContext.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "docs", "assets", "bridge-status");
const hubUrl = "http://127.0.0.1:9980";
const targetId = process.env.TARGET_ID || "owned-a8675c34";

await ensureHub({ hubUrl, hubDir: process.cwd() });
const hub = new HubClient(hubUrl);
const peers = await hub.listPeers();
const peer = (peers.peers || peers).find?.((p) => p.id === targetId) ||
	(Array.isArray(peers) ? peers.find((p) => p.id === targetId) : null);
console.log("STEP peers", JSON.stringify(peers, null, 2).slice(0, 800));

const registry = new TargetRegistry(undefined, { seedLab: false });
resetTargetRegistryForTests(registry);
registry.attachHub(hub);
await registry.selectAsync(targetId);
const tdClient = createTouchDesignerClient({ logger: { sendLog: () => {} } });
const withSticky = (fn) =>
	runWithTarget(registry.asOrigin(registry.getSelected()), fn);

const extract = (data) =>
	data && typeof data === "object" && "result" in data ? data.result : data;

async function exec(label, script) {
	console.log(`\n=== ${label} ===`);
	const data = await withSticky(async () => {
		const r = await tdClient.execPythonScript({ script });
		if (!r.success) throw r.error;
		return r.data;
	});
	const result = extract(data);
	console.log("result:", typeof result === "string" ? result : JSON.stringify(result));
	return result;
}

async function statusFace(label) {
	await sleep(400);
	return exec(`status face — ${label}`, `
from utils import tdmcp_status
tdmcp_status.flush(force=True)
b = op('/project1/tdmcp_bridge')
t = b.op('status_text') if b else None
log = b.op('event_log') if b else None
result = {
	'text': (t.text if t else '') or '',
	'logRows': int(log.numRows) if log else 0,
	'lastRows': [[log[r,0].val, log[r,1].val, log[r,2].val] for r in range(max(1, log.numRows-3), log.numRows)] if log and log.numRows > 1 else [],
}
`);
}

async function capturePng(nodePath, name) {
	const data = await withSticky(async () => {
		const script = `
import base64
node = op(${JSON.stringify(nodePath)})
if node is None:
	raise Exception('missing')
ba = node.saveByteArray('.png')
result = base64.b64encode(bytes(ba)).decode('ascii')
`;
		const r = await tdClient.execPythonScript({ script });
		if (!r.success) throw r.error;
		return r.data;
	});
	const b64 = extract(data);
	const buf = Buffer.from(String(b64).replace(/^data:image\/\w+;base64,/, ""), "base64");
	mkdirSync(ASSETS, { recursive: true });
	const out = join(ASSETS, name);
	writeFileSync(out, buf);
	console.log("WROTE", out, buf.length);
	return out;
}

// 1) Identity
await exec("identity", `
result = {
	'folder': project.folder,
	'name': project.name,
	'pid': __import__('os').getpid(),
}
`);

await statusFace("before build");

// 2) Visible demo COMP under /project1 (NOT _agent_scratch)
await exec("create /project1/demo_live", `
root = op('/project1')
demo = root.op('demo_live')
if demo is not None:
	demo.destroy()
demo = root.create(baseCOMP, 'demo_live')
demo.nodeX = 0
demo.nodeY = 200
demo.viewer = True
result = demo.path
`);

await statusFace("after create COMP");

// 3) Noise → Level → Transform → Out chain
await exec("build TOP chain", `
demo = op('/project1/demo_live')
n = demo.create(noiseTOP, 'noise1')
n.par.type = 'sparse'
n.par.period = 4
n.par.amp = 1
n.nodeX = 0
n.nodeY = 0

lv = demo.create(levelTOP, 'level1')
lv.par.brightness1 = 1.2
lv.par.contrast = 1.15
lv.inputConnectors[0].connect(n)
lv.nodeX = 200
lv.nodeY = 0

tr = demo.create(transformTOP, 'spin1')
tr.par.rotate = 12
tr.par.sx = 1.05
tr.par.sy = 1.05
tr.inputConnectors[0].connect(lv)
tr.nodeX = 400
tr.nodeY = 0

out = demo.create(outTOP, 'out1')
out.inputConnectors[0].connect(tr)
out.nodeX = 600
out.nodeY = 0

demo.par.opviewer = './out1'
demo.viewer = True
result = {'noise': n.path, 'out': out.path, 'viewer': str(demo.par.opviewer)}
`);

await statusFace("after TOP chain");

// 4) Capture look + bridge face for the user
await capturePng("/project1/demo_live/out1", "demo-live-out.png");
await capturePng("/project1/tdmcp_bridge/status_top", "demo-live-status.png");

await exec("errors check", `
errs = []
for o in op('/project1/demo_live').findChildren(type=TOP, maxDepth=2):
	e = o.errors()
	if e:
		errs.append((o.path, e))
result = {'errors': errs, 'ok': len(errs) == 0}
`);

console.log("\nDEMO_DONE — watch /project1/demo_live and tdmcp_bridge faces in TD");

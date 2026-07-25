#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { HubClient } from "../dist/hub/client.js";
import { ensureHub } from "../dist/hub/ensureHub.js";
import { startTdProject } from "../dist/lifecycle/tdProcess.js";
import {
	TargetRegistry,
	resetTargetRegistryForTests,
} from "../dist/core/targetRegistry.js";
import { createTouchDesignerClient } from "../dist/tdClient/index.js";
import { runWithTarget } from "../dist/core/targetContext.js";

const proj =
	process.env.PROJ ||
	"c:/Users/corbe/Documents/Derivative/Projects/touchdesigner-mcp-td/.agent-td/bridge-status-check";
const toePath = join(proj, "bridge_status_check.toe");
const statePath = join(proj, ".tdmcp", "state.json");
const hubUrl = "http://127.0.0.1:9980";
const targetId = "owned-a8675c34";
const nonce = randomBytes(16).toString("hex");

const state = {
	host: "http://127.0.0.1",
	hubUrl,
	port: 0,
	targetId,
	transport: "tunnel",
	nonce,
	toe_launched: toePath,
	toePath,
};
writeFileSync(statePath, JSON.stringify(state, null, 2));
console.log("STATE", state);

await ensureHub({ hubUrl, hubDir: process.cwd() });
const hub = new HubClient(hubUrl);
await hub.expectPeer({
	id: targetId,
	nonce,
	projectDir: proj,
	toePath,
	label: "HITL bridge status",
});

const registry = new TargetRegistry(undefined, { seedLab: false });
resetTargetRegistryForTests(registry);
registry.attachHub(hub);
const tdClient = createTouchDesignerClient({ logger: { sendLog: () => {} } });

const started = await startTdProject({
	hubClient: hub,
	registry,
	tdClient,
	toePath,
	timeoutMs: 180_000,
});
console.log("STARTED", started.targetId, started.identity);

await new Promise((r) => setTimeout(r, 1500));
const origin = registry.asOrigin(registry.getSelected());
const probe = await runWithTarget(origin, async () => {
	const script = `
from utils import tdmcp_status
tdmcp_status.flush(force=True)
b = op('/project1/tdmcp_bridge')
t = b.op('status_text') if b else None
log = b.op('event_log') if b else None
c = None
parent = op('/project1')
scratch = parent.op('_agent_scratch')
if scratch is None:
	scratch = parent.create(baseCOMP, '_agent_scratch')
c = scratch.op('hitl_const')
if c is None:
	c = scratch.create(constantTOP, 'hitl_const')
	c.par.colorr = 0.9
	c.par.colorg = 0.3
	c.par.colorb = 0.1
tdmcp_status.flush(force=True)
result = {
	'text': (t.text if t else '') or '',
	'logRows': int(log.numRows) if log else 0,
	'viewer': bool(getattr(b, 'viewer', False)) if b else False,
	'opviewer': str(getattr(b.par, 'opviewer', '')) if b else '',
}
`;
	const r = await tdClient.execPythonScript({ script });
	if (!r.success) throw r.error;
	return r.data?.result ?? r.data;
});
console.log("PROBE", JSON.stringify(probe, null, 2));
console.log("HITL_READY", toePath);

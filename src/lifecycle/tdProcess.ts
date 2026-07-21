import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { TouchDesignerClient } from "../tdClient/touchDesignerClient.js";
import {
	findTdExecutable,
	readState,
	writeState,
	type TdMcpState,
} from "../core/lifecycle.js";
import { LAB_TARGET_ID } from "../core/targetTypes.js";
import type { TargetRegistry } from "../core/targetRegistry.js";
import { runWithTarget } from "../core/targetContext.js";
import { withTargetQueue } from "../core/targetQueue.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type StartProjectResult = {
	targetId: string;
	port: number;
	pid: number;
	toePath: string;
	identity?: Record<string, unknown>;
};

export async function startTdProject(params: {
	toePath: string;
	registry: TargetRegistry;
	tdClient: TouchDesignerClient;
	tdExe?: string;
	timeoutMs?: number;
}): Promise<StartProjectResult> {
	const toePath = resolve(params.toePath);
	if (!existsSync(toePath)) {
		throw new Error(`start_td_project: toe not found: ${toePath}`);
	}
	const projectDir = dirname(toePath);
	const state = readState(projectDir);
	if (!state?.port || !state.targetId) {
		throw new Error(
			`start_td_project: missing .tdmcp/state.json in ${projectDir}. Run create_td_project first.`,
		);
	}

	const exe = findTdExecutable(params.tdExe);
	const child: ChildProcess = spawn(exe, [toePath], {
		detached: true,
		stdio: "ignore",
		windowsHide: false,
	});
	child.unref();
	const pid = child.pid;
	if (!pid) {
		throw new Error("start_td_project: failed to spawn TouchDesigner");
	}

	const nextState: TdMcpState = {
		...state,
		exe,
		pid,
		started_at: new Date().toISOString(),
		toe_launched: toePath,
	};
	writeState(projectDir, nextState);

	const host = state.host || "http://127.0.0.1";
	const target = params.registry.upsertOwned({
		host,
		id: state.targetId,
		label: `Owned ${toePath}`,
		port: state.port,
		projectDir,
		toePath,
	});

	const timeoutMs = params.timeoutMs ?? 120_000;
	const deadline = Date.now() + timeoutMs;
	let identity: Record<string, unknown> | undefined;
	while (Date.now() < deadline) {
		try {
			identity = await probeIdentity(params.tdClient, target.id, host, state.port);
			break;
		} catch {
			await sleep(1000);
		}
	}
	if (!identity) {
		throw new Error(
			`start_td_project: timed out waiting for bridge on ${host}:${state.port}`,
		);
	}

	// Prefer live osPid when available
	const livePid = Number(identity.osPid);
	if (Number.isFinite(livePid) && livePid > 0) {
		nextState.pid = livePid;
		writeState(projectDir, nextState);
	}

	params.registry.select(state.targetId);
	return {
		identity,
		pid: nextState.pid ?? pid,
		port: state.port,
		targetId: state.targetId,
		toePath,
	};
}

export async function stopTdProject(params: {
	targetId: string;
	registry: TargetRegistry;
	tdClient: TouchDesignerClient;
}): Promise<{ stopped: true; targetId: string }> {
	const { targetId } = params;
	if (targetId === LAB_TARGET_ID) {
		throw new Error("stop_td_project: refusing to stop builtin target \"lab\"");
	}
	const target = params.registry.get(targetId);
	if (!target || target.source !== "owned") {
		throw new Error(
			`stop_td_project: target "${targetId}" is not an MCP-owned instance`,
		);
	}
	const projectDir = target.projectDir;
	const state = projectDir ? readState(projectDir) : null;
	const pid = state?.pid;

	try {
		await runWithTarget(params.registry.asOrigin(target), async () =>
			withTargetQueue(targetId, async () => {
				await params.tdClient.execPythonScript({
					script: "project.quit(force=True)\nprint('quit_ok')",
				});
			}),
		);
	} catch {
		// Bridge may already be down; fall through to PID kill
	}

	if (pid) {
		const deadline = Date.now() + 15_000;
		while (Date.now() < deadline && isPidAlive(pid)) {
			await sleep(500);
		}
		if (isPidAlive(pid)) {
			try {
				process.kill(pid);
			} catch {
				// ignore
			}
			await sleep(500);
			if (isPidAlive(pid)) {
				try {
					process.kill(pid, 9);
				} catch {
					// ignore
				}
			}
		}
	}

	if (projectDir && state) {
		const { pid: _p, started_at: _s, exe: _e, ...rest } = state;
		writeState(projectDir, rest);
	}
	params.registry.removeOwned(targetId);
	return { stopped: true, targetId };
}

function isPidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

const IDENTITY_SCRIPT = `
import os, json
print("__ID__" + json.dumps({
  "projectName": project.name,
  "projectFolder": project.folder,
  "osPid": os.getpid(),
}))
`;

export async function probeIdentity(
	tdClient: TouchDesignerClient,
	targetId: string,
	host: string,
	port: number,
): Promise<Record<string, unknown>> {
	return runWithTarget({ host, id: targetId, port }, async () =>
		withTargetQueue(targetId, async () => {
			const info = await tdClient.getTdInfo();
			if (!info.success) {
				throw info.error;
			}
			const scriptResult = await tdClient.execPythonScript({
				script: IDENTITY_SCRIPT,
			});
			if (!scriptResult.success) {
				throw scriptResult.error;
			}
			const data = scriptResult.data as {
				stdout?: string;
				result?: unknown;
			};
			const stdout = String(data?.stdout ?? "");
			const marker = "__ID__";
			const idx = stdout.lastIndexOf(marker);
			let identity: Record<string, unknown> = {};
			if (idx >= 0) {
				try {
					identity = JSON.parse(stdout.slice(idx + marker.length)) as Record<
						string,
						unknown
					>;
				} catch {
					identity = {};
				}
			}
			return {
				...(info.data as Record<string, unknown>),
				...identity,
				targetId,
				webServerPort: port,
			};
		}),
	);
}

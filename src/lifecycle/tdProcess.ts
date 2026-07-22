import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
	findTdExecutable,
	readState,
	type TdMcpState,
	writeState,
} from "../core/lifecycle.js";
import { runWithTarget } from "../core/targetContext.js";
import { withTargetQueue } from "../core/targetQueue.js";
import type { TargetRegistry } from "../core/targetRegistry.js";
import { LAB_TARGET_ID } from "../core/targetTypes.js";
import type { TouchDesignerClient } from "../tdClient/touchDesignerClient.js";
import {
	dedupeDialogs,
	dismissAllTdUiDialogs,
	inspectTdUi,
	inspectTdUiLight,
	type TdUiDialog,
	type TdUiInspectResult,
} from "./tdDialogs.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type StartProjectResult = {
	targetId: string;
	port: number;
	pid: number;
	toePath: string;
	identity?: Record<string, unknown>;
	dismissedDialogs: TdUiDialog[];
};

export type StartWaitDeps = {
	inspect: (pid: number) => Promise<TdUiInspectResult>;
	inspectLight: (pid: number) => Promise<TdUiInspectResult>;
	dismissAll: (
		dialogs: TdUiDialog[],
	) => Promise<{ attempted: TdUiDialog[]; dismissed: TdUiDialog[] }>;
	probe: () => Promise<Record<string, unknown>>;
	sleepMs?: (ms: number) => Promise<void>;
};

/**
 * Wait for bridge while inspecting/dismissing TD UI dialogs (testable core).
 */
export async function waitForBridgeWithDialogs(params: {
	pid: number;
	deadlineMs: number;
	deps: StartWaitDeps;
}): Promise<{
	identity: Record<string, unknown>;
	dismissedDialogs: TdUiDialog[];
	lastSnapshot: TdUiInspectResult;
}> {
	const sleepFn = params.deps.sleepMs ?? sleep;
	const dismissedDialogs: TdUiDialog[] = [];
	let consecutiveInspectTimeouts = 0;
	let lastSnapshot: TdUiInspectResult = {
		dialogs: [],
		mainWindowTitle: null,
		responding: true,
	};
	let identity: Record<string, unknown> | undefined;
	let lastProbeError: string | undefined;
	let watchPid = params.pid;

	while (Date.now() < params.deadlineMs) {
		const useLight = consecutiveInspectTimeouts >= 2;
		const snapshot = useLight
			? await params.deps.inspectLight(watchPid)
			: await params.deps.inspect(watchPid);
		lastSnapshot = snapshot;
		if (snapshot.inspectTimedOut) {
			consecutiveInspectTimeouts += 1;
		} else {
			consecutiveInspectTimeouts = 0;
		}

		if (snapshot.dialogs.length > 0) {
			const { dismissed } = await params.deps.dismissAll(snapshot.dialogs);
			for (const d of dismissed) {
				dismissedDialogs.push(d);
			}
			// Also record hard/unknown that we attempted even if dismiss failed
			for (const d of snapshot.dialogs) {
				if (
					!dismissed.some((x) => x.title === d.title && x.message === d.message)
				) {
					dismissedDialogs.push(d);
				}
			}
		}

		try {
			identity = await params.deps.probe();
			const live = Number(identity.osPid);
			if (Number.isFinite(live) && live > 0) {
				watchPid = live;
			}
			break;
		} catch (error) {
			lastProbeError = error instanceof Error ? error.message : String(error);
			await sleepFn(1000);
		}
	}

	const unique = dedupeDialogs(dismissedDialogs);

	if (!identity) {
		const snap = {
			dismissedDialogs: unique,
			inspectTimedOut: lastSnapshot.inspectTimedOut ?? false,
			mainWindowTitle: lastSnapshot.mainWindowTitle,
			responding: lastSnapshot.responding,
		};
		throw new Error(
			"start_td_project: timed out waiting for bridge" +
				(lastProbeError ? ` (last error: ${lastProbeError})` : "") +
				` uiSnapshot=${JSON.stringify(snap)}`,
		);
	}

	// Final UI pass after bridge is up (modal can coexist with HTTP)
	const finalSnap = await params.deps.inspect(watchPid);
	lastSnapshot = finalSnap;
	if (finalSnap.dialogs.length > 0) {
		const { dismissed } = await params.deps.dismissAll(finalSnap.dialogs);
		for (const d of [...dismissed, ...finalSnap.dialogs]) {
			unique.push(d);
		}
	}

	return {
		dismissedDialogs: dedupeDialogs(unique),
		identity,
		lastSnapshot,
	};
}

export async function startTdProject(params: {
	toePath: string;
	registry: TargetRegistry;
	tdClient: TouchDesignerClient;
	tdExe?: string;
	timeoutMs?: number;
	/** Test-only overrides */
	_test?: Partial<StartWaitDeps> & { pid?: number; skipSpawn?: boolean };
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

	let pid = params._test?.pid;
	if (!params._test?.skipSpawn) {
		const exe = findTdExecutable(params.tdExe);
		const child: ChildProcess = spawn(exe, [toePath], {
			detached: true,
			stdio: "ignore",
			windowsHide: false,
		});
		child.unref();
		pid = child.pid;
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
	} else if (!pid) {
		throw new Error("start_td_project: _test.skipSpawn requires _test.pid");
	} else {
		writeState(projectDir, {
			...state,
			pid,
			started_at: new Date().toISOString(),
			toe_launched: toePath,
		});
	}

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
	const deadlineMs = Date.now() + timeoutMs;

	const deps: StartWaitDeps = {
		dismissAll: params._test?.dismissAll ?? dismissAllTdUiDialogs,
		inspect: params._test?.inspect ?? inspectTdUi,
		inspectLight: params._test?.inspectLight ?? inspectTdUiLight,
		probe:
			params._test?.probe ??
			(() => probeIdentity(params.tdClient, target.id, host, state.port)),
		sleepMs: params._test?.sleepMs,
	};

	const { identity, dismissedDialogs } = await waitForBridgeWithDialogs({
		deadlineMs,
		deps,
		pid: pid as number,
	});

	const nextState = readState(projectDir) ?? state;
	const livePid = Number(identity.osPid);
	if (Number.isFinite(livePid) && livePid > 0) {
		nextState.pid = livePid;
		writeState(projectDir, nextState);
	}

	params.registry.select(state.targetId);
	return {
		dismissedDialogs,
		identity,
		pid: nextState.pid ?? (pid as number),
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
		throw new Error('stop_td_project: refusing to stop builtin target "lab"');
	}
	const target = params.registry.get(targetId);
	if (target?.source !== "owned") {
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

/** Resolve OS pid for sticky target (owned state or probed identity). */
export function resolveTargetPid(
	registry: TargetRegistry,
	identityOsPid?: number,
): number | null {
	if (Number.isFinite(identityOsPid) && (identityOsPid as number) > 0) {
		return identityOsPid as number;
	}
	const selected = registry.getSelected();
	if (selected.projectDir) {
		const state = readState(selected.projectDir);
		if (state?.pid && state.pid > 0) {
			return state.pid;
		}
	}
	return null;
}

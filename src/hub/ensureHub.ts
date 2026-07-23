import { type ChildProcess, spawn } from "node:child_process";
import {
	closeSync,
	existsSync,
	openSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	defaultHubBaseUrl,
	HUB_APP_NAME,
	HUB_DEFAULT_HOST,
	HUB_DEFAULT_PORT,
} from "./constants.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type EnsureHubOptions = {
	/** Base URL, default http://127.0.0.1:9980 */
	hubUrl?: string;
	/** Package root containing dist/hub.js (defaults to package root from this module) */
	hubDir?: string;
	/** Max wait for health after spawn */
	timeoutMs?: number;
	/** Skip spawn (tests) — only poll health */
	pollOnly?: boolean;
};

export type EnsureHubResult = {
	hubUrl: string;
	alreadyRunning: boolean;
	spawned: boolean;
};

function lockPath(): string {
	return join(tmpdir(), "tdmcp-hub.lock");
}

function pidPath(): string {
	return join(tmpdir(), "tdmcp-hub.pid");
}

export function resolveHubJs(hubDir?: string): string {
	if (hubDir) {
		const candidate = join(resolve(hubDir), "dist", "hub.js");
		if (existsSync(candidate)) return candidate;
		const alt = join(resolve(hubDir), "hub.js");
		if (existsSync(alt)) return alt;
		throw new Error(`ensureHub: hub.js not found under ${hubDir}`);
	}
	const here = dirname(fileURLToPath(import.meta.url));
	const candidates = [
		resolve(here, "hub.js"), // dist/hub/ when bundled oddly
		resolve(here, "../hub.js"), // dist/hub.js next to dist/hub/
		resolve(here, "../../dist/hub.js"), // from src during tests? unlikely
		resolve(here, "../../../dist/hub.js"),
	];
	// Prefer package root: dist/hub/ensureHub.js → ../../hub.js is wrong;
	// from dist/hub/ensureHub.js → ../hub.js
	const fromDistHub = resolve(here, "../hub.js");
	if (existsSync(fromDistHub)) return fromDistHub;
	for (const c of candidates) {
		if (existsSync(c)) return c;
	}
	throw new Error(
		`ensureHub: dist/hub.js not found (looked near ${here}). Run npm run build.`,
	);
}

export async function hubHealthOk(hubUrl: string): Promise<boolean> {
	try {
		const res = await fetch(`${hubUrl.replace(/\/$/, "")}/health`, {
			signal: AbortSignal.timeout(800),
		});
		if (!res.ok) return false;
		const body = (await res.json()) as { app?: string; ok?: boolean };
		return body.app === HUB_APP_NAME && body.ok === true;
	} catch {
		return false;
	}
}

function tryAcquireLock(): number | null {
	try {
		const fd = openSync(lockPath(), "wx");
		return fd;
	} catch {
		return null;
	}
}

function releaseLock(fd: number): void {
	try {
		closeSync(fd);
	} catch {
		// ignore
	}
	try {
		unlinkSync(lockPath());
	} catch {
		// ignore
	}
}

function spawnHub(hubJs: string, hubUrl: string): ChildProcess {
	const u = new URL(hubUrl.includes("://") ? hubUrl : `http://${hubUrl}`);
	const port = u.port || String(HUB_DEFAULT_PORT);
	const host = u.hostname || HUB_DEFAULT_HOST;
	const child = spawn(
		process.execPath,
		[hubJs, `--host=${host}`, `--port=${port}`],
		{
			detached: true,
			stdio: "ignore",
			windowsHide: true,
		},
	);
	child.unref();
	if (child.pid) {
		try {
			writeFileSync(pidPath(), `${child.pid}\n`, "utf8");
		} catch {
			// ignore
		}
	}
	return child;
}

/**
 * Health-check hub; if down, lock + spawn detached `node dist/hub.js`.
 */
export async function ensureHub(
	options: EnsureHubOptions = {},
): Promise<EnsureHubResult> {
	const hubUrl =
		options.hubUrl ??
		process.env.TDMCP_HUB_URL ??
		defaultHubBaseUrl(HUB_DEFAULT_HOST, HUB_DEFAULT_PORT);
	const timeoutMs = options.timeoutMs ?? 15_000;

	if (await hubHealthOk(hubUrl)) {
		return { alreadyRunning: true, hubUrl, spawned: false };
	}
	if (options.pollOnly) {
		throw new Error(`ensureHub: hub not healthy at ${hubUrl} (pollOnly)`);
	}

	const deadline = Date.now() + timeoutMs;
	let spawned = false;

	while (Date.now() < deadline) {
		if (await hubHealthOk(hubUrl)) {
			return { alreadyRunning: !spawned, hubUrl, spawned };
		}

		const fd = tryAcquireLock();
		if (fd !== null) {
			try {
				if (await hubHealthOk(hubUrl)) {
					return { alreadyRunning: true, hubUrl, spawned: false };
				}
				const hubJs = resolveHubJs(options.hubDir);
				spawnHub(hubJs, hubUrl);
				spawned = true;
			} finally {
				releaseLock(fd);
			}
		}

		await sleep(200);
	}

	if (await hubHealthOk(hubUrl)) {
		return { alreadyRunning: !spawned, hubUrl, spawned };
	}
	throw new Error(
		`ensureHub: timed out waiting for ${hubUrl} (spawned=${spawned})`,
	);
}

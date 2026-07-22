import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
	closeSync,
	cpSync,
	createReadStream,
	existsSync,
	mkdirSync,
	openSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { findToeTools } from "./toeTools.js";

const CACHE_ROOT = join(tmpdir(), "tdmcp-toe-cache");
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_EXPAND_BYTES = 500_000_000;
const LOCK_POLL_MS = 100;

export type ExpandResult = {
	toePath: string;
	cacheKey: string;
	cacheDir: string;
	expandDir: string;
	tocPath: string;
	build: string | null;
	cacheHit: boolean;
	warnings: string[];
};

/** In-process dedupe of concurrent expands for the same cache key. */
const inflightExpands = new Map<string, Promise<ExpandResult>>();

function sha256File(filePath: string): Promise<string> {
	return new Promise((resolveHash, reject) => {
		const hash = createHash("sha256");
		const stream = createReadStream(filePath);
		stream.on("data", (chunk) => hash.update(chunk));
		stream.on("error", reject);
		stream.on("end", () => resolveHash(hash.digest("hex")));
	});
}

function readBuildFile(expandDir: string): string | null {
	const buildPath = join(expandDir, ".build");
	if (!existsSync(buildPath)) return null;
	const text = readFileSync(buildPath, "utf8");
	const m = text.match(/^build\s+(\S+)/m);
	return m?.[1] ?? null;
}

function runToeexpand(
	toeexpand: string,
	args: string[],
	timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
	return new Promise((resolveProc, reject) => {
		const child = spawn(toeexpand, args, {
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
		});
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`toeexpand timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		child.stdout?.on("data", (d: Buffer) => {
			stdout += d.toString("utf8");
		});
		child.stderr?.on("data", (d: Buffer) => {
			stderr += d.toString("utf8");
		});
		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolveProc({ code, stderr, stdout });
		});
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function isCacheComplete(
	expandDir: string,
	tocPath: string,
	metaPath: string,
): boolean {
	return existsSync(expandDir) && existsSync(tocPath) && existsSync(metaPath);
}

function tryReclaimStaleLock(lockPath: string, timeoutMs: number): boolean {
	try {
		const raw = readFileSync(lockPath, "utf8");
		const data = JSON.parse(raw) as { pid?: number; at?: number };
		const at = typeof data.at === "number" ? data.at : 0;
		if (Date.now() - at > timeoutMs) {
			unlinkSync(lockPath);
			return true;
		}
	} catch {
		try {
			unlinkSync(lockPath);
			return true;
		} catch {
			return false;
		}
	}
	return false;
}

/**
 * Acquire exclusive expand lock (cross-process). Call release() in finally.
 */
async function acquireExpandLock(
	cacheDir: string,
	timeoutMs: number,
): Promise<{ release: () => void }> {
	const lockPath = join(cacheDir, ".tdmcp-expand.lock");
	mkdirSync(cacheDir, { recursive: true });
	const start = Date.now();

	while (Date.now() - start <= timeoutMs) {
		try {
			const fd = openSync(lockPath, "wx");
			try {
				writeFileSync(
					fd,
					`${JSON.stringify({ at: Date.now(), pid: process.pid })}\n`,
				);
			} finally {
				closeSync(fd);
			}
			return {
				release: () => {
					try {
						unlinkSync(lockPath);
					} catch {
						/* ignore */
					}
				},
			};
		} catch {
			if (tryReclaimStaleLock(lockPath, timeoutMs)) {
				continue;
			}
			await sleep(LOCK_POLL_MS);
		}
	}
	throw new Error(
		`get_toe_digest: timed out waiting for expand lock after ${timeoutMs}ms (${lockPath})`,
	);
}

async function expandToeUnlocked(params: {
	abs: string;
	cacheKey: string;
	cacheDir: string;
	cachedToe: string;
	expandDir: string;
	tocPath: string;
	metaPath: string;
	toeName: string;
	refresh?: boolean;
	tdExe?: string;
	timeoutMs: number;
	maxExpandBytes: number;
}): Promise<ExpandResult> {
	const warnings: string[] = [];

	if (
		!params.refresh &&
		isCacheComplete(params.expandDir, params.tocPath, params.metaPath)
	) {
		return {
			build: readBuildFile(params.expandDir),
			cacheDir: params.cacheDir,
			cacheHit: true,
			cacheKey: params.cacheKey,
			expandDir: params.expandDir,
			tocPath: params.tocPath,
			toePath: params.abs,
			warnings,
		};
	}

	if (params.refresh && existsSync(params.cacheDir)) {
		rmSync(params.cacheDir, { force: true, recursive: true });
	}
	mkdirSync(params.cacheDir, { recursive: true });
	cpSync(params.abs, params.cachedToe);

	const { toeexpand } = findToeTools(params.tdExe);
	const { stdout, stderr } = await runToeexpand(
		toeexpand,
		[params.cachedToe],
		params.timeoutMs,
	);
	const combined = `${stdout}\n${stderr}`;

	if (!existsSync(params.expandDir) || !existsSync(params.tocPath)) {
		throw new Error(
			`toeexpand failed to produce ${params.toeName}.dir / ${params.toeName}.toc. Output: ${combined.slice(0, 800)}`,
		);
	}

	const build = readBuildFile(params.expandDir);
	let bytesExpanded = 0;
	try {
		bytesExpanded = dirByteSize(params.expandDir);
	} catch {
		warnings.push("could_not_measure_expand_size");
	}
	if (bytesExpanded > params.maxExpandBytes) {
		warnings.push(
			`expand_size_exceeds_ceiling:${bytesExpanded}>${params.maxExpandBytes}`,
		);
	}

	writeFileSync(
		params.metaPath,
		`${JSON.stringify(
			{
				build,
				bytesExpanded,
				expandedAt: new Date().toISOString(),
				sourceToe: params.abs,
				toeexpand,
			},
			null,
			2,
		)}\n`,
	);

	return {
		build,
		cacheDir: params.cacheDir,
		cacheHit: false,
		cacheKey: params.cacheKey,
		expandDir: params.expandDir,
		tocPath: params.tocPath,
		toePath: params.abs,
		warnings,
	};
}

/**
 * Copy toe into hash cache and run toeexpand. Never expands in-place beside the source.
 * Note: toeexpand often exits with code 1 even on success — success is presence of
 * `*.toe.dir` + `*.toe.toc`.
 *
 * Concurrent calls for the same toe are serialized (in-process Promise + lockfile).
 */
export async function ensureExpandedToe(params: {
	toePath: string;
	refresh?: boolean;
	tdExe?: string;
	timeoutMs?: number;
	maxExpandBytes?: number;
}): Promise<ExpandResult> {
	const abs = resolve(params.toePath);
	if (!existsSync(abs)) {
		throw new Error(`get_toe_digest: toe not found: ${abs}`);
	}
	if (!abs.toLowerCase().endsWith(".toe")) {
		throw new Error(`get_toe_digest: expected a .toe file: ${abs}`);
	}

	const cacheKey = await sha256File(abs);
	const cacheDir = join(CACHE_ROOT, cacheKey);
	const toeName = basename(abs);
	const cachedToe = join(cacheDir, toeName);
	const expandDir = join(cacheDir, `${toeName}.dir`);
	const tocPath = join(cacheDir, `${toeName}.toc`);
	const metaPath = join(cacheDir, "tdmcp-expand.json");
	const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const maxExpandBytes = params.maxExpandBytes ?? DEFAULT_MAX_EXPAND_BYTES;

	mkdirSync(CACHE_ROOT, { recursive: true });

	if (!params.refresh && isCacheComplete(expandDir, tocPath, metaPath)) {
		return {
			build: readBuildFile(expandDir),
			cacheDir,
			cacheHit: true,
			cacheKey,
			expandDir,
			tocPath,
			toePath: abs,
			warnings: [],
		};
	}

	const existing = inflightExpands.get(cacheKey);
	if (existing && !params.refresh) {
		const result = await existing;
		return {
			...result,
			cacheHit: true,
			warnings: [...result.warnings],
		};
	}

	const run = (async (): Promise<ExpandResult> => {
		const lock = await acquireExpandLock(cacheDir, timeoutMs);
		try {
			return await expandToeUnlocked({
				abs,
				cacheDir,
				cachedToe,
				cacheKey,
				expandDir,
				maxExpandBytes,
				metaPath,
				refresh: params.refresh,
				tdExe: params.tdExe,
				timeoutMs,
				tocPath,
				toeName,
			});
		} finally {
			lock.release();
		}
	})();

	inflightExpands.set(cacheKey, run);
	try {
		return await run;
	} finally {
		inflightExpands.delete(cacheKey);
	}
}

function dirByteSize(root: string): number {
	let total = 0;
	const stack = [root];
	while (stack.length) {
		const cur = stack.pop();
		if (!cur) break;
		const st = statSync(cur);
		if (st.isDirectory()) {
			for (const name of readdirSync(cur)) {
				stack.push(join(cur, name));
			}
		} else {
			total += st.size;
		}
	}
	return total;
}

export function cacheRoot(): string {
	return CACHE_ROOT;
}

/** Test helper: clear in-process inflight map. */
export function _resetExpandInflightForTests(): void {
	inflightExpands.clear();
}

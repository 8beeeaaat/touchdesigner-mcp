import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	createReadStream,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { findToeTools } from "./toeTools.js";

const CACHE_ROOT = join(tmpdir(), "tdmcp-toe-cache");
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_EXPAND_BYTES = 500_000_000;

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

/**
 * Copy toe into hash cache and run toeexpand. Never expands in-place beside the source.
 * Note: toeexpand often exits with code 1 even on success — success is presence of
 * `*.toe.dir` + `*.toe.toc`.
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

	const warnings: string[] = [];
	const cacheKey = await sha256File(abs);
	const cacheDir = join(CACHE_ROOT, cacheKey);
	const toeName = basename(abs);
	const cachedToe = join(cacheDir, toeName);
	const expandDir = join(cacheDir, `${toeName}.dir`);
	const tocPath = join(cacheDir, `${toeName}.toc`);
	const metaPath = join(cacheDir, "tdmcp-expand.json");

	mkdirSync(CACHE_ROOT, { recursive: true });

	const cacheReady =
		!params.refresh &&
		existsSync(expandDir) &&
		existsSync(tocPath) &&
		existsSync(metaPath);

	if (cacheReady) {
		return {
			build: readBuildFile(expandDir),
			cacheDir,
			cacheHit: true,
			cacheKey,
			expandDir,
			tocPath,
			toePath: abs,
			warnings,
		};
	}

	if (params.refresh && existsSync(cacheDir)) {
		rmSync(cacheDir, { force: true, recursive: true });
	}
	mkdirSync(cacheDir, { recursive: true });
	cpSync(abs, cachedToe);

	const { toeexpand } = findToeTools(params.tdExe);
	const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const { stdout, stderr } = await runToeexpand(
		toeexpand,
		[cachedToe],
		timeoutMs,
	);
	const combined = `${stdout}\n${stderr}`;

	if (!existsSync(expandDir) || !existsSync(tocPath)) {
		throw new Error(
			`toeexpand failed to produce ${toeName}.dir / ${toeName}.toc. Output: ${combined.slice(0, 800)}`,
		);
	}

	const build = readBuildFile(expandDir);
	let bytesExpanded = 0;
	try {
		bytesExpanded = dirByteSize(expandDir);
	} catch {
		warnings.push("could_not_measure_expand_size");
	}
	const maxBytes = params.maxExpandBytes ?? DEFAULT_MAX_EXPAND_BYTES;
	if (bytesExpanded > maxBytes) {
		warnings.push(`expand_size_exceeds_ceiling:${bytesExpanded}>${maxBytes}`);
	}

	writeFileSync(
		metaPath,
		`${JSON.stringify(
			{
				build,
				bytesExpanded,
				expandedAt: new Date().toISOString(),
				sourceToe: abs,
				toeexpand,
			},
			null,
			2,
		)}\n`,
	);

	return {
		build,
		cacheDir,
		cacheHit: false,
		cacheKey,
		expandDir,
		tocPath,
		toePath: abs,
		warnings,
	};
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

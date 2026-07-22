import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { findToeTools } from "./toeTools.js";

const DEFAULT_TIMEOUT_MS = 120_000;

function runTool(
	exe: string,
	args: string[],
	timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
	return new Promise((resolveProc, reject) => {
		const child = spawn(exe, args, {
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
		});
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`${basename(exe)} timed out after ${timeoutMs}ms`));
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
 * Expand a `.toe` in place (creates `<toe>.dir` + `<toe>.toc` beside it).
 * Unlike ToeDigest cache, this mutates the working directory next to the toe.
 */
export async function expandToeInPlace(params: {
	toePath: string;
	tdExe?: string;
	timeoutMs?: number;
}): Promise<{ expandDir: string; tocPath: string; output: string }> {
	const { toeexpand } = findToeTools(params.tdExe);
	const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const { stdout, stderr } = await runTool(
		toeexpand,
		[params.toePath],
		timeoutMs,
	);
	const expandDir = `${params.toePath}.dir`;
	const tocPath = `${params.toePath}.toc`;
	const output = `${stdout}\n${stderr}`;
	if (!existsSync(expandDir) || !existsSync(tocPath)) {
		throw new Error(
			`toeexpand failed to produce ${basename(expandDir)} / ${basename(tocPath)}. Output: ${output.slice(0, 800)}`,
		);
	}
	return { expandDir, output, tocPath };
}

/**
 * Collapse an expanded `.toe.dir` (+ sibling `.toc`) into a `.toe`.
 * Success = non-zero `.toe` beside the expand dir (Derivative often exits non-zero).
 */
export async function collapseToeInPlace(params: {
	expandDir: string;
	tdExe?: string;
	timeoutMs?: number;
	/** Expected output toe path (default: expandDir with `.dir` stripped). */
	outToePath?: string;
}): Promise<{ toePath: string; bytes: number; output: string }> {
	const tools = findToeTools(params.tdExe);
	if (!tools.toecollapse) {
		throw new Error(
			`toecollapse not found beside TouchDesigner at ${tools.tdBinDir}`,
		);
	}
	const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const expandDir = params.expandDir;
	const toePath =
		params.outToePath ??
		(expandDir.endsWith(".dir")
			? expandDir.slice(0, -".dir".length)
			: join(dirname(expandDir), `${basename(expandDir)}.toe`));

	const { stdout, stderr } = await runTool(
		tools.toecollapse,
		[expandDir],
		timeoutMs,
	);
	const output = `${stdout}\n${stderr}`;
	if (!existsSync(toePath)) {
		throw new Error(
			`toecollapse did not produce ${toePath}. Output: ${output.slice(0, 800)}`,
		);
	}
	const bytes = statSync(toePath).size;
	if (bytes <= 0) {
		throw new Error(
			`toecollapse produced 0-byte toe at ${toePath}. Output: ${output.slice(0, 800)}`,
		);
	}
	return { bytes, output, toePath };
}

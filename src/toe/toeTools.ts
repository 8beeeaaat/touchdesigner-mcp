import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findTdExecutable } from "../core/lifecycle.js";

export type ToeToolPaths = {
	toeexpand: string;
	/** Present for Slice B; not used in v1 digest. */
	toecollapse: string | null;
	tdBinDir: string;
};

/**
 * Resolve toeexpand next to TouchDesigner.exe (same discovery roots as findTdExecutable).
 */
export function findToeTools(explicitTdExe?: string): ToeToolPaths {
	const tdExe = findTdExecutable(explicitTdExe);
	const tdBinDir = join(tdExe, "..");
	const toeexpand = join(
		tdBinDir,
		process.platform === "win32" ? "toeexpand.exe" : "toeexpand",
	);
	if (!existsSync(toeexpand)) {
		throw new Error(`toeexpand not found beside TouchDesigner at ${tdBinDir}`);
	}
	const collapseName =
		process.platform === "win32" ? "toecollapse.exe" : "toecollapse";
	const toecollapsePath = join(tdBinDir, collapseName);
	return {
		tdBinDir,
		toecollapse: existsSync(toecollapsePath) ? toecollapsePath : null,
		toeexpand,
	};
}

/** Newest TouchDesigner bin that contains toeexpand (for tests/smoke). */
export function tryFindToeexpand(): string | null {
	try {
		return findToeTools().toeexpand;
	} catch {
		const bases = [
			"C:\\Program Files\\Derivative",
			"C:\\Program Files (x86)\\Derivative",
			"/Applications",
		];
		for (const base of bases) {
			if (!existsSync(base)) continue;
			const names = readdirSync(base).sort().reverse();
			for (const name of names) {
				const candidates = [
					join(base, name, "bin", "toeexpand.exe"),
					join(base, name, "bin", "toeexpand"),
					join(base, name, "Contents", "MacOS", "toeexpand"),
				];
				for (const c of candidates) {
					if (existsSync(c)) return c;
				}
			}
		}
		return null;
	}
}

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { readOpHintFromN, readTextFile } from "./parseExpand.js";
import { resolveWalkMaxDepth } from "./walkDepth.js";

export type FileKind =
	| "n"
	| "parm"
	| "text"
	| "network"
	| "table"
	| "bin"
	| "other";

export type ExpandFileEntry = {
	rel: string;
	abs: string;
	bytes: number;
	kind: FileKind;
	textLike: boolean;
	opHint?: string;
	binary?: boolean;
	sha256?: string;
};

const TEXT_EXT = new Set([
	".n",
	".parm",
	".cparm",
	".text",
	".network",
	".table",
	".toc",
	".build",
	".root",
	".start",
	".application",
	".grps",
	".panel",
]);

function kindFromName(name: string): FileKind {
	const lower = name.toLowerCase();
	if (lower.endsWith(".n")) return "n";
	if (lower.endsWith(".parm") || lower.endsWith(".cparm")) return "parm";
	if (lower.endsWith(".text")) return "text";
	if (lower.endsWith(".network")) return "network";
	if (lower.endsWith(".table")) return "table";
	const ext = extnameLower(name);
	if (!ext || TEXT_EXT.has(ext)) return "other";
	return "bin";
}

function extnameLower(name: string): string {
	const i = name.lastIndexOf(".");
	if (i < 0) return "";
	return name.slice(i).toLowerCase();
}

function toRel(expandDir: string, abs: string): string {
	return relative(expandDir, abs).split(sep).join("/");
}

function passesFilter(rel: string, filter: string): boolean {
	if (!filter) return true;
	return (
		rel === filter ||
		rel.startsWith(`${filter}/`) ||
		filter.startsWith(`${rel}/`)
	);
}

/**
 * Resolve a path under expandDir; throws on escape.
 */
export function resolveUnderExpand(
	expandDir: string,
	relOrName: string,
	baseDir?: string,
): { abs: string; rel: string } {
	const expandAbs = resolve(expandDir);
	const cleaned = relOrName.replace(/\\/g, "/");
	if (cleaned.includes("..")) {
		throw new Error(`get_toe: path escape rejected: ${relOrName}`);
	}
	const candidate = cleaned.includes("/")
		? resolve(expandAbs, cleaned)
		: resolve(baseDir ?? expandAbs, cleaned);
	const rel = relative(expandAbs, candidate);
	if (rel.startsWith("..")) {
		throw new Error(`get_toe: path escape rejected: ${relOrName}`);
	}
	return { abs: candidate, rel: rel.split(sep).join("/") };
}

export function listExpandFiles(
	expandDir: string,
	pathFilter: string | undefined,
	maxDepth: number,
	maxFiles: number,
	relativeDepth?: number,
): { files: ExpandFileEntry[]; truncated: boolean; omitted: number } {
	const filterNorm = pathFilter
		? pathFilter.replace(/^[/\\]+/, "").replace(/\\/g, "/")
		: "";
	const { walkMaxDepth } = resolveWalkMaxDepth(
		filterNorm || undefined,
		maxDepth,
		relativeDepth,
	);
	const all: ExpandFileEntry[] = [];

	function walk(absDir: string, depth: number): void {
		let names: string[];
		try {
			names = readdirSync(absDir).sort();
		} catch {
			return;
		}
		for (const name of names) {
			if (name === "." || name === "..") continue;
			const child = join(absDir, name);
			let st: ReturnType<typeof statSync>;
			try {
				st = statSync(child);
			} catch {
				continue;
			}
			const childDepth = depth + 1;
			if (childDepth > walkMaxDepth) continue;
			const rel = toRel(expandDir, child);
			if (st.isDirectory()) {
				if (name.startsWith(".")) continue;
				if (!passesFilter(rel, filterNorm)) continue;
				if (childDepth < walkMaxDepth) walk(child, childDepth);
				continue;
			}
			if (name.startsWith(".") && name !== ".build") {
				// allow .build at root only via depth
			}
			if (!passesFilter(rel, filterNorm) && filterNorm) {
				const parent = dirname(rel).replace(/\\/g, "/");
				if (parent !== filterNorm && !rel.startsWith(`${filterNorm}/`)) {
					continue;
				}
			}
			all.push(fileEntry(expandDir, child, rel));
		}
	}

	walk(expandDir, 0);
	all.sort((a, b) => a.rel.localeCompare(b.rel));
	const truncated = all.length > maxFiles;
	return {
		files: all.slice(0, maxFiles),
		omitted: truncated ? all.length - maxFiles : 0,
		truncated,
	};
}

function fileEntry(
	_expandDir: string,
	abs: string,
	rel: string,
): ExpandFileEntry {
	const st = statSync(abs);
	const kind = kindFromName(basename(abs));
	const textLike = TEXT_EXT.has(extnameLower(basename(abs))) || kind !== "bin";
	const entry: ExpandFileEntry = {
		abs,
		bytes: st.size,
		kind: kind === "other" && !textLike ? "bin" : kind,
		rel,
		textLike: kind !== "bin",
	};
	if (kind === "bin") {
		entry.binary = true;
		entry.textLike = false;
	}
	if (kind === "n") {
		const body = readTextFile(abs);
		if (body) entry.opHint = readOpHintFromN(body);
	}
	return entry;
}

/**
 * Sidecars for a logical node path + stem siblings (glsl1 → glsl1_compute.text).
 */
export function sidecarsForNode(
	expandDir: string,
	nodeRel: string,
): ExpandFileEntry[] {
	const clean = nodeRel.replace(/^[/\\]+/, "").replace(/\\/g, "/");
	const parent = dirname(clean);
	const stem = basename(clean);
	const parentAbs =
		parent === "." || parent === "" ? expandDir : join(expandDir, parent);
	const out: ExpandFileEntry[] = [];
	if (!existsSync(parentAbs)) return out;

	const exactExts = [".n", ".parm", ".cparm", ".text", ".network", ".table"];
	for (const ext of exactExts) {
		const abs = join(parentAbs, `${stem}${ext}`);
		if (!existsSync(abs)) continue;
		out.push(fileEntry(expandDir, abs, toRel(expandDir, abs)));
	}

	let names: string[];
	try {
		names = readdirSync(parentAbs);
	} catch {
		return out;
	}
	for (const name of names) {
		if (!name.startsWith(`${stem}_`)) continue;
		const abs = join(parentAbs, name);
		try {
			if (!statSync(abs).isFile()) continue;
		} catch {
			continue;
		}
		const rel = toRel(expandDir, abs);
		if (out.some((e) => e.rel === rel)) continue;
		out.push(fileEntry(expandDir, abs, rel));
	}
	out.sort((a, b) => a.rel.localeCompare(b.rel));
	return out;
}

export function readExpandFileBody(
	expandDir: string,
	relOrName: string,
	opts: { baseDir?: string; maxChars: number },
): {
	abs: string;
	rel: string;
	bytes: number;
	binary: boolean;
	sha256?: string;
	body?: string;
	truncated: boolean;
} {
	const { abs, rel } = resolveUnderExpand(expandDir, relOrName, opts.baseDir);
	if (!existsSync(abs)) {
		throw new Error(`get_toe: file not found: ${rel}`);
	}
	const st = statSync(abs);
	const kind = kindFromName(basename(abs));
	if (kind === "bin") {
		const hash = createHash("sha256");
		hash.update(readFileSync(abs));
		return {
			abs,
			binary: true,
			bytes: st.size,
			rel,
			sha256: hash.digest("hex"),
			truncated: false,
		};
	}
	const bodyFull = readFileSync(abs, "utf8");
	const truncated = bodyFull.length > opts.maxChars;
	return {
		abs,
		binary: false,
		body: truncated
			? `${bodyFull.slice(0, opts.maxChars)}\n… truncated`
			: bodyFull,
		bytes: st.size,
		rel,
		truncated,
	};
}

/** Count .n first-line families under expand root. */
export function countByFamily(expandDir: string): Record<string, number> {
	const counts: Record<string, number> = {};
	const stack = [expandDir];
	while (stack.length) {
		const cur = stack.pop();
		if (!cur) break;
		let names: string[];
		try {
			names = readdirSync(cur);
		} catch {
			continue;
		}
		for (const name of names) {
			const child = join(cur, name);
			let st: ReturnType<typeof statSync>;
			try {
				st = statSync(child);
			} catch {
				continue;
			}
			if (st.isDirectory()) {
				if (!name.startsWith(".")) stack.push(child);
				continue;
			}
			if (!name.toLowerCase().endsWith(".n")) continue;
			const body = readTextFile(child);
			const hint = body ? readOpHintFromN(body) : undefined;
			const family = hint?.split(":")[0] ?? "unknown";
			counts[family] = (counts[family] ?? 0) + 1;
		}
	}
	return counts;
}

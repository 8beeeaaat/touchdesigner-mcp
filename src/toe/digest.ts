import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { type ExpandResult, ensureExpandedToe } from "./expandCache.js";

export type DigestMode = "stats" | "outline" | "nodes";

export type DigestNode = {
	relPath: string;
	kind: "dir" | "node";
	/** Cheap L1 hint from first line of `name.n` when present (e.g. COMP:base). */
	opHint?: string;
	bytes?: number;
};

export type ToeDigestStats = {
	schema_version: 1;
	mode: "stats";
	toePath: string;
	build: string | null;
	cacheHit: boolean;
	fileCount: number;
	dirCount: number;
	bytesExpanded: number;
	topLevel: string[];
	truncated: boolean;
	warnings: string[];
};

export type ToeDigestOutline = {
	schema_version: 1;
	mode: "outline";
	toePath: string;
	build: string | null;
	cacheHit: boolean;
	outline: string;
	truncated: boolean;
	omitted: number;
	warnings: string[];
};

export type ToeDigestNodes = {
	schema_version: 1;
	mode: "nodes";
	toePath: string;
	build: string | null;
	cacheHit: boolean;
	nodes: DigestNode[];
	truncated: boolean;
	omitted: number;
	warnings: string[];
};

export type ToeDigestResult =
	| ToeDigestStats
	| ToeDigestOutline
	| ToeDigestNodes;

const SIDECAR_EXT = new Set([
	".parm",
	".cparm",
	".panel",
	".text",
	".table",
	".gnode",
	".chop",
	".beat",
	".lod",
	".tox",
	".xyzw",
]);

export type DigestOptions = {
	toePath: string;
	mode?: DigestMode;
	path?: string;
	maxDepth?: number;
	maxNodes?: number;
	maxChars?: number;
	refresh?: boolean;
	tdExe?: string;
};

/**
 * Expand (cached) then build a token-bounded ToeDigest.
 * Paths are **expand-relative**, not guaranteed `op()` paths.
 */
export async function getToeDigest(
	opts: DigestOptions,
): Promise<ToeDigestResult> {
	const mode = opts.mode ?? "outline";
	const maxDepth = opts.maxDepth ?? 3;
	const maxNodes = opts.maxNodes ?? 80;
	const maxChars = opts.maxChars ?? 6000;

	const expanded = await ensureExpandedToe({
		refresh: opts.refresh,
		tdExe: opts.tdExe,
		toePath: opts.toePath,
	});

	const warnings = [
		...expanded.warnings,
		"paths_are_expand_relative_not_guaranteed_op_paths",
	];

	if (mode === "stats") {
		return buildStats(expanded, warnings);
	}

	const entries = collectOutlineEntries(
		expanded.expandDir,
		opts.path,
		maxDepth,
	);

	if (mode === "nodes") {
		const truncated = entries.length > maxNodes;
		const nodes = entries.slice(0, maxNodes);
		return {
			build: expanded.build,
			cacheHit: expanded.cacheHit,
			mode: "nodes",
			nodes,
			omitted: truncated ? entries.length - nodes.length : 0,
			schema_version: 1,
			toePath: expanded.toePath,
			truncated,
			warnings,
		};
	}

	return buildOutline(expanded, entries, maxChars, maxNodes, warnings);
}

function buildStats(
	expanded: ExpandResult,
	warnings: string[],
): ToeDigestStats {
	let fileCount = 0;
	let dirCount = 0;
	let bytesExpanded = 0;
	const stack = [expanded.expandDir];
	while (stack.length) {
		const cur = stack.pop();
		if (!cur) break;
		const st = statSync(cur);
		if (st.isDirectory()) {
			if (cur !== expanded.expandDir) dirCount += 1;
			for (const name of readdirSync(cur)) {
				stack.push(join(cur, name));
			}
		} else {
			fileCount += 1;
			bytesExpanded += st.size;
		}
	}

	const topLevel = [
		...new Set(
			readdirSync(expanded.expandDir)
				.filter((n) => {
					if (n.startsWith(".")) return false;
					const full = join(expanded.expandDir, n);
					return statSync(full).isDirectory() || n.endsWith(".n");
				})
				.map((n) => (n.endsWith(".n") ? n.slice(0, -2) : n)),
		),
	].sort();

	return {
		build: expanded.build,
		bytesExpanded,
		cacheHit: expanded.cacheHit,
		dirCount,
		fileCount,
		mode: "stats",
		schema_version: 1,
		toePath: expanded.toePath,
		topLevel,
		truncated: false,
		warnings,
	};
}

function buildOutline(
	expanded: ExpandResult,
	entries: DigestNode[],
	maxChars: number,
	maxNodes: number,
	warnings: string[],
): ToeDigestOutline {
	const lines: string[] = [];
	if (expanded.build) {
		lines.push(`build: ${expanded.build}`);
	}
	const limited = entries.slice(0, maxNodes);
	let omitted = Math.max(0, entries.length - limited.length);

	for (const e of limited) {
		const parts = e.relPath.split("/").filter(Boolean);
		const depth = Math.max(0, parts.length - 1);
		const indent = "  ".repeat(depth);
		const name = basename(e.relPath);
		const hint = e.opHint ? `  # ${e.opHint}` : "";
		const suffix = e.kind === "dir" ? "/" : "";
		lines.push(`${indent}${name}${suffix}${hint}`);
	}

	let outline = lines.join("\n");
	let truncated = omitted > 0;
	if (outline.length > maxChars) {
		outline = `${outline.slice(0, Math.max(0, maxChars - 40))}\n… truncated by maxChars`;
		truncated = true;
		omitted = Math.max(omitted, 1);
	} else if (omitted > 0) {
		outline = `${outline}\n… truncated, ${omitted} omitted`;
	}

	return {
		build: expanded.build,
		cacheHit: expanded.cacheHit,
		mode: "outline",
		omitted,
		outline,
		schema_version: 1,
		toePath: expanded.toePath,
		truncated,
		warnings,
	};
}

/**
 * Collect dirs + logical nodes (`*.n` basenames). Skip meta/sidecar files.
 * `pathFilter` is expand-relative (e.g. `project1` or `project1/geo1`).
 * `maxDepth` is depth from expand root (project1 is depth 1).
 */
export function collectOutlineEntries(
	expandDir: string,
	pathFilter: string | undefined,
	maxDepth: number,
): DigestNode[] {
	const filterNorm = pathFilter
		? pathFilter.replace(/^[/\\]+/, "").replace(/\\/g, "/")
		: "";

	const out: DigestNode[] = [];

	function walk(absDir: string, depth: number): void {
		let names: string[];
		try {
			names = readdirSync(absDir).sort();
		} catch {
			return;
		}

		for (const name of names) {
			if (name.startsWith(".")) continue;
			const child = join(absDir, name);
			let st: ReturnType<typeof statSync>;
			try {
				st = statSync(child);
			} catch {
				continue;
			}
			const childDepth = depth + 1;
			if (childDepth > maxDepth) continue;

			const rel = relPosix(expandDir, child);

			if (st.isDirectory()) {
				if (!passesFilter(rel, filterNorm)) continue;
				out.push({
					kind: "dir",
					opHint: readOpHint(join(absDir, `${name}.n`)),
					relPath: rel,
				});
				if (childDepth < maxDepth) {
					walk(child, childDepth);
				}
				continue;
			}

			if (!name.toLowerCase().endsWith(".n")) {
				const ext = extnameLower(name);
				if (SIDECAR_EXT.has(ext)) continue;
				continue;
			}

			const nodeRel = rel.replace(/\.n$/i, "");
			if (!passesFilter(nodeRel, filterNorm)) continue;

			const dirTwin = join(absDir, name.slice(0, -2));
			if (existsSync(dirTwin) && statSync(dirTwin).isDirectory()) {
				continue;
			}

			out.push({
				kind: "node",
				opHint: readOpHint(child),
				relPath: nodeRel,
			});
		}
	}

	walk(expandDir, 0);
	out.sort((a, b) => a.relPath.localeCompare(b.relPath));
	return out;
}

/** Include if no filter, or rel is under filter / is an ancestor of filter. */
function passesFilter(rel: string, filter: string): boolean {
	if (!filter) return true;
	return (
		rel === filter ||
		rel.startsWith(`${filter}/`) ||
		filter === rel ||
		filter.startsWith(`${rel}/`)
	);
}

function relPosix(root: string, abs: string): string {
	return relative(root, abs).split(sep).join("/");
}

function extnameLower(name: string): string {
	const i = name.lastIndexOf(".");
	if (i < 0) return "";
	return name.slice(i).toLowerCase();
}

function readOpHint(nPath: string): string | undefined {
	if (!existsSync(nPath)) return undefined;
	try {
		const buf = readFileSync(nPath, { encoding: "utf8" });
		const first = buf.split(/\r?\n/, 1)[0]?.trim();
		if (first && /^[A-Z]+:[A-Za-z0-9_]+$/.test(first)) return first;
		return undefined;
	} catch {
		return undefined;
	}
}

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { type ExpandResult, ensureExpandedToe } from "./expandCache.js";
import { type ExpandLocator, toExpandLocator } from "./expandLocator.js";
import {
	type CompExtensionGroup,
	collectCompExtensions,
	type ExtensionsSummary,
} from "./extensions.js";
import {
	countByFamily,
	type ExpandFileEntry,
	listExpandFiles,
	sidecarsForNode,
} from "./filesInventory.js";
import { inspectToeBuild, type ToeBuildReport } from "./graftManifest.js";
import { nFileForPath, readOpHintFromN } from "./parseExpand.js";
import { collectRefs, formatRefsText } from "./refs.js";
import { resolveWalkMaxDepth } from "./walkDepth.js";
import {
	collectWireEdges,
	formatWireEdgesText,
	nodesInEdges,
	resolveWiresForSeed,
} from "./wires.js";

export type DigestMode =
	| "stats"
	| "outline"
	| "nodes"
	| "wires"
	| "refs"
	| "files"
	| "brief"
	| "extensions"
	| "validate";

export type DigestNode = {
	relPath: string;
	kind: "dir" | "node";
	opHint?: string;
	bytes?: number;
};

type DigestBase = {
	schema_version: 1;
	toePath: string;
	build: string | null;
	expand: ExpandLocator;
	warnings: string[];
};

export type ToeDigestStats = DigestBase & {
	mode: "stats";
	cacheHit: boolean;
	fileCount: number;
	dirCount: number;
	bytesExpanded: number;
	topLevel: string[];
	byFamily: Record<string, number>;
	extensionsSummary?: ExtensionsSummary;
	truncated: boolean;
};

export type ToeDigestOutline = DigestBase & {
	mode: "outline";
	cacheHit: boolean;
	outline: string;
	truncated: boolean;
	omitted: number;
};

export type ToeDigestNodes = DigestBase & {
	mode: "nodes";
	cacheHit: boolean;
	nodes: DigestNode[];
	truncated: boolean;
	omitted: number;
};

export type ToeDigestWires = DigestBase & {
	mode: "wires";
	cacheHit: boolean;
	wires: string;
	truncated: boolean;
	omitted: number;
	edgeCount: number;
};

export type ToeDigestRefs = DigestBase & {
	mode: "refs";
	cacheHit: boolean;
	refs: string;
	truncated: boolean;
	omitted: number;
	refCount: number;
	refKind: "opOnly" | "all";
};

export type ToeDigestFiles = DigestBase & {
	mode: "files";
	cacheHit: boolean;
	files: ExpandFileEntry[];
	truncated: boolean;
	omitted: number;
};

export type ToeDigestBrief = DigestBase & {
	mode: "brief";
	cacheHit: boolean;
	seed: string;
	radius: number;
	nodes: { relPath: string; opHint?: string }[];
	wires: string;
	files: ExpandFileEntry[];
	truncated: boolean;
	omitted: number;
	edgeCount: number;
};

export type ToeDigestExtensions = DigestBase & {
	mode: "extensions";
	cacheHit: boolean;
	extensions: CompExtensionGroup[];
	summary: ExtensionsSummary;
	truncated: boolean;
	omitted: number;
};

/** Toe build check: sibling name dups, toc dups, project-dir tox↔op collisions. */
export type ToeDigestValidate = DigestBase & {
	mode: "validate";
	cacheHit: boolean;
	ok: boolean;
	toeBuild: ToeBuildReport;
	truncated: boolean;
};

export type ToeDigestResult =
	| ToeDigestStats
	| ToeDigestOutline
	| ToeDigestNodes
	| ToeDigestWires
	| ToeDigestRefs
	| ToeDigestFiles
	| ToeDigestBrief
	| ToeDigestExtensions
	| ToeDigestValidate;

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
	/** Overrides levels-below-path when `path` is set. */
	relativeDepth?: number;
	maxNodes?: number;
	maxChars?: number;
	refresh?: boolean;
	tdExe?: string;
	/** Ego seed for wires (or brief uses path). */
	around?: string;
	radius?: number;
	refKind?: "opOnly" | "all";
};

function baseFields(
	expanded: ExpandResult,
	warnings: string[],
): DigestBase & { cacheHit: boolean } {
	return {
		build: expanded.build,
		cacheHit: expanded.cacheHit,
		expand: toExpandLocator(expanded),
		schema_version: 1,
		toePath: expanded.toePath,
		warnings,
	};
}

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
	const radius = opts.radius ?? 1;
	const refKind = opts.refKind ?? "opOnly";
	const relativeDepth = opts.relativeDepth;

	const expanded = await ensureExpandedToe({
		refresh: opts.refresh,
		tdExe: opts.tdExe,
		toePath: opts.toePath,
	});

	const warnings = [
		...expanded.warnings,
		"paths_are_expand_relative_not_guaranteed_op_paths",
	];
	if (opts.path) {
		warnings.push("maxDepth_is_relative_to_path_when_path_set");
	}
	const base = baseFields(expanded, warnings);

	if (mode === "stats") {
		return buildStats(expanded, base);
	}

	if (mode === "validate") {
		const projectDir = dirname(expanded.toePath);
		const toeBuild = inspectToeBuild({
			expandDir: expanded.expandDir,
			projectDir,
			tocPath: expanded.tocPath,
		});
		const validateWarnings = [...warnings];
		if (!toeBuild.ok) {
			validateWarnings.push(`toe_build_failed:${toeBuild.errors.length}`);
		}
		return {
			...base,
			cacheHit: expanded.cacheHit,
			mode: "validate",
			ok: toeBuild.ok,
			toeBuild,
			truncated: false,
			warnings: validateWarnings,
		};
	}

	if (mode === "extensions") {
		return buildExtensions(
			expanded,
			base,
			opts.path,
			maxDepth,
			relativeDepth,
			maxNodes,
		);
	}

	if (mode === "brief") {
		const seed = (opts.path ?? opts.around)?.replace(/^[/\\]+/, "");
		if (!seed) {
			throw new Error('get_toe_digest: mode "brief" requires path (hub seed)');
		}
		return buildBrief(
			expanded,
			base,
			seed,
			radius,
			maxDepth,
			relativeDepth,
			maxNodes,
			maxChars,
		);
	}

	if (mode === "files") {
		const { files, truncated, omitted } = listExpandFiles(
			expanded.expandDir,
			opts.path,
			maxDepth,
			maxNodes,
			relativeDepth,
		);
		return {
			...base,
			files,
			mode: "files",
			omitted,
			truncated,
		};
	}

	if (mode === "wires") {
		const around = opts.around ?? opts.path;
		if (around) {
			const scoped = collectWireEdges(
				expanded.expandDir,
				around,
				Math.max(maxDepth, 8),
				relativeDepth,
			);
			const mixed = resolveWiresForSeed(
				expanded.expandDir,
				scoped,
				around,
				radius,
			);
			const { text, truncated, omitted } = formatWireEdgesText(
				mixed,
				maxNodes,
				maxChars,
			);
			return {
				...base,
				edgeCount: mixed.length,
				mode: "wires",
				omitted,
				truncated,
				wires: text,
			};
		}
		const edges = collectWireEdges(
			expanded.expandDir,
			opts.path,
			maxDepth,
			relativeDepth,
		);
		const { text, truncated, omitted } = formatWireEdgesText(
			edges,
			maxNodes,
			maxChars,
		);
		return {
			...base,
			edgeCount: edges.length,
			mode: "wires",
			omitted,
			truncated,
			wires: text,
		};
	}

	if (mode === "refs") {
		const hits = collectRefs(
			expanded.expandDir,
			opts.path,
			maxDepth,
			refKind,
			relativeDepth,
		);
		const { text, truncated, omitted } = formatRefsText(
			hits,
			maxNodes,
			maxChars,
		);
		return {
			...base,
			mode: "refs",
			omitted,
			refCount: hits.length,
			refKind,
			refs: text,
			truncated,
		};
	}

	const entries = collectOutlineEntries(
		expanded.expandDir,
		opts.path,
		maxDepth,
		relativeDepth,
	);

	if (mode === "nodes") {
		const truncated = entries.length > maxNodes;
		const nodes = entries.slice(0, maxNodes);
		return {
			...base,
			mode: "nodes",
			nodes,
			omitted: truncated ? entries.length - nodes.length : 0,
			truncated,
		};
	}

	return buildOutline(expanded, base, entries, maxChars, maxNodes);
}

function buildExtensions(
	expanded: ExpandResult,
	base: DigestBase & { cacheHit: boolean },
	pathFilter: string | undefined,
	maxDepth: number,
	relativeDepth: number | undefined,
	maxNodes: number,
): ToeDigestExtensions {
	const { extensions, summary } = collectCompExtensions(
		expanded.expandDir,
		pathFilter,
		maxDepth,
		relativeDepth,
	);
	const truncated = extensions.length > maxNodes;
	const sliced = extensions.slice(0, maxNodes);
	return {
		...base,
		extensions: sliced,
		mode: "extensions",
		omitted: truncated ? extensions.length - sliced.length : 0,
		summary,
		truncated,
	};
}

function buildBrief(
	expanded: ExpandResult,
	base: DigestBase & { cacheHit: boolean },
	seed: string,
	radius: number,
	maxDepth: number,
	relativeDepth: number | undefined,
	maxNodes: number,
	maxChars: number,
): ToeDigestBrief {
	const parentScope = seed.includes("/")
		? seed.slice(0, seed.lastIndexOf("/"))
		: undefined;
	const scoped = collectWireEdges(
		expanded.expandDir,
		parentScope,
		Math.max(maxDepth, 6),
		relativeDepth,
	);
	const edges = resolveWiresForSeed(expanded.expandDir, scoped, seed, radius);
	const nodePaths = nodesInEdges(edges);
	if (!nodePaths.includes(seed)) nodePaths.push(seed);
	nodePaths.sort();

	const nodes = nodePaths.slice(0, maxNodes).map((relPath) => ({
		opHint: readOpHint(nFileForPath(expanded.expandDir, relPath)),
		relPath,
	}));

	const fileMap = new Map<string, ExpandFileEntry>();
	for (const n of nodePaths.slice(0, maxNodes)) {
		for (const f of sidecarsForNode(expanded.expandDir, n)) {
			fileMap.set(f.rel, f);
		}
	}
	const files = [...fileMap.values()].sort((a, b) =>
		a.rel.localeCompare(b.rel),
	);
	const filesTrunc = files.length > maxNodes;
	const filesOut = files.slice(0, maxNodes);

	const { text, truncated, omitted } = formatWireEdgesText(
		edges,
		maxNodes,
		maxChars,
	);

	return {
		...base,
		edgeCount: edges.length,
		files: filesOut,
		mode: "brief",
		nodes,
		omitted: omitted + (filesTrunc ? files.length - filesOut.length : 0),
		radius,
		seed,
		truncated: truncated || filesTrunc || nodePaths.length > maxNodes,
		wires: text,
	};
}

function buildStats(
	expanded: ExpandResult,
	base: DigestBase & { cacheHit: boolean },
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

	const { summary: extensionsSummary } = collectCompExtensions(
		expanded.expandDir,
		undefined,
		32,
	);

	return {
		...base,
		byFamily: countByFamily(expanded.expandDir),
		bytesExpanded,
		dirCount,
		extensionsSummary,
		fileCount,
		mode: "stats",
		topLevel,
		truncated: false,
	};
}

function buildOutline(
	expanded: ExpandResult,
	base: DigestBase & { cacheHit: boolean },
	entries: DigestNode[],
	maxChars: number,
	maxNodes: number,
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
		...base,
		mode: "outline",
		omitted,
		outline,
		truncated,
	};
}

export function collectOutlineEntries(
	expandDir: string,
	pathFilter: string | undefined,
	maxDepth: number,
	relativeDepth?: number,
): DigestNode[] {
	const filterNorm = pathFilter
		? pathFilter.replace(/^[/\\]+/, "").replace(/\\/g, "/")
		: "";
	const { walkMaxDepth } = resolveWalkMaxDepth(
		filterNorm || undefined,
		maxDepth,
		relativeDepth,
	);

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
			if (childDepth > walkMaxDepth) continue;

			const rel = relPosix(expandDir, child);

			if (st.isDirectory()) {
				if (!passesFilter(rel, filterNorm)) continue;
				out.push({
					kind: "dir",
					opHint: readOpHint(join(absDir, `${name}.n`)),
					relPath: rel,
				});
				if (childDepth < walkMaxDepth) {
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
		return readOpHintFromN(buf);
	} catch {
		return undefined;
	}
}

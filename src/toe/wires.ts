import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import {
	type CompInputEdge,
	networkFileForPath,
	nFileForPath,
	type OpInputEdge,
	parseCompInputs,
	parseNInputs,
	parseParmRows,
	readTextFile,
	resolveSiblingPath,
	type WireEdge,
} from "./parseExpand.js";
import { resolveWalkMaxDepth } from "./walkDepth.js";

export type SelectParmEdge = {
	kind: "select";
	/** Node that owns the select/ref parm. */
	to: string;
	/** Target path as written / best-effort resolved. */
	from: string;
	param: string;
	index: number;
};

export type DigestWireEdge = WireEdge | SelectParmEdge;

function passesFilter(rel: string, filter: string): boolean {
	if (!filter) return true;
	return (
		rel === filter ||
		rel.startsWith(`${filter}/`) ||
		filter.startsWith(`${rel}/`)
	);
}

function toRel(expandDir: string, abs: string): string {
	return relative(expandDir, abs).split(sep).join("/");
}

function normalizePath(p: string): string {
	return p.replace(/^[/\\]+/, "").replace(/\\/g, "/");
}

/** Walk expand tree for .n and .network under filter/maxDepth; collect wire edges. */
export function collectWireEdges(
	expandDir: string,
	pathFilter: string | undefined,
	maxDepth: number,
	relativeDepth?: number,
): WireEdge[] {
	const filterNorm = pathFilter
		? pathFilter.replace(/^[/\\]+/, "").replace(/\\/g, "/")
		: "";
	const { walkMaxDepth } = resolveWalkMaxDepth(
		filterNorm || undefined,
		maxDepth,
		relativeDepth,
	);
	const edges: WireEdge[] = [];

	function walk(absDir: string, depth: number): void {
		let names: string[];
		try {
			names = readdirSync(absDir);
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
			const rel = toRel(expandDir, child);

			if (st.isDirectory()) {
				if (!passesFilter(rel, filterNorm)) continue;
				if (childDepth < walkMaxDepth) walk(child, childDepth);
				continue;
			}

			if (name.toLowerCase().endsWith(".n")) {
				const nodeRel = rel.replace(/\.n$/i, "");
				if (!passesFilter(nodeRel, filterNorm)) continue;
				const body = readTextFile(child);
				if (!body) continue;
				for (const inp of parseNInputs(body)) {
					edges.push({
						fromName: inp.name,
						index: inp.index,
						kind: "op",
						to: nodeRel,
					});
				}
				continue;
			}

			if (name.toLowerCase().endsWith(".network")) {
				const compRel = rel.replace(/\.network$/i, "");
				if (!passesFilter(compRel, filterNorm)) continue;
				const body = readTextFile(child);
				if (!body) continue;
				for (const inp of parseCompInputs(body)) {
					edges.push({
						connector: inp.connector,
						family: inp.family,
						from: inp.from,
						index: inp.index,
						kind: "comp",
						to: compRel,
					});
				}
			}
		}
	}

	walk(expandDir, 0);
	return edges;
}

/** True when expand path is a COMP directory (has dir + .n). */
export function isCompHub(expandDir: string, relPath: string): boolean {
	const hub = normalizePath(relPath);
	const dirAbs = join(expandDir, hub);
	const nAbs = nFileForPath(expandDir, hub);
	try {
		return (
			existsSync(nAbs) && existsSync(dirAbs) && statSync(dirAbs).isDirectory()
		);
	} catch {
		return false;
	}
}

function edgeEndpoints(e: WireEdge): { from: string; to: string } {
	const to = e.to;
	const from =
		e.kind === "op"
			? resolveSiblingPath(e.to, e.fromName)
			: e.from.replace(/\/out\d+$/i, "").replace(/\/in\d+$/i, "");
	return { from, to };
}

function isUnderHub(path: string, hub: string): boolean {
	return path === hub || path.startsWith(`${hub}/`);
}

function isImmediateChild(path: string, hub: string): boolean {
	if (!path.startsWith(`${hub}/`)) return false;
	return !path.slice(hub.length + 1).includes("/");
}

/**
 * Wires among children of a COMP hub (container), plus optional Select/ref parm edges.
 */
export function hubChildrenWires(
	expandDir: string,
	hubPath: string,
	opts?: { includeSelectParms?: boolean; relativeDepth?: number },
): DigestWireEdge[] {
	const hub = normalizePath(hubPath);
	const includeSelect = opts?.includeSelectParms !== false;
	const edges = collectWireEdges(expandDir, hub, opts?.relativeDepth ?? 8);

	const out: DigestWireEdge[] = [];
	for (const e of edges) {
		const { from, to } = edgeEndpoints(e);
		const fromNode = from.replace(/\/out\d+$/i, "").replace(/\/in\d+$/i, "");
		if (
			(isUnderHub(to, hub) && isUnderHub(fromNode, hub)) ||
			isImmediateChild(to, hub) ||
			isImmediateChild(fromNode, hub)
		) {
			out.push(e);
		}
	}

	if (includeSelect) {
		out.push(...collectSelectParmEdges(expandDir, hub));
	}
	return out;
}

const SELECT_PARMS = new Set(["top", "pop", "chops", "select", "topop"]);

function looksLikeOpPath(value: string): boolean {
	const v = value.trim().replace(/^["']|["']$/g, "");
	if (!v || v === '""') return false;
	if (/\bop\s*\(/.test(v)) return true;
	if (/^[a-zA-Z_][\w]*(?:\/[a-zA-Z_][\w]*)+/.test(v)) return true;
	return false;
}

function extractPathValue(raw: string): string {
	const quoted = raw.match(/"([^"]+)"/);
	if (quoted) return quoted[1];
	const parts = raw.trim().split(/\s+/);
	for (let i = parts.length - 1; i >= 0; i -= 1) {
		const p = parts[i];
		if (looksLikeOpPath(p) || p.includes("/"))
			return p.replace(/^["']|["']$/g, "");
	}
	return parts
		.slice(1)
		.join(" ")
		.replace(/^["']|["']$/g, "");
}

function collectSelectParmEdges(
	expandDir: string,
	hub: string,
): SelectParmEdge[] {
	const hubAbs = join(expandDir, hub);
	if (!existsSync(hubAbs)) return [];
	let names: string[];
	try {
		names = readdirSync(hubAbs);
	} catch {
		return [];
	}
	const edges: SelectParmEdge[] = [];
	for (const name of names) {
		if (!name.toLowerCase().endsWith(".parm")) continue;
		const nodeRel = `${hub}/${name.slice(0, -5)}`;
		const body = readTextFile(join(hubAbs, name));
		if (!body) continue;
		for (const row of parseParmRows(body)) {
			if (!SELECT_PARMS.has(row.name.toLowerCase())) continue;
			const from = extractPathValue(row.raw);
			if (!looksLikeOpPath(from) && !from.includes("/")) continue;
			edges.push({
				from: resolveSiblingPath(nodeRel, from),
				index: 0,
				kind: "select",
				param: row.name.toLowerCase(),
				to: nodeRel,
			});
		}
	}
	return edges;
}

/**
 * If seed is a COMP hub and ego is empty, return hub-children wires.
 * Otherwise return ego edges (possibly empty).
 */
export function resolveWiresForSeed(
	expandDir: string,
	allOrScoped: WireEdge[],
	seed: string,
	radius: number,
): DigestWireEdge[] {
	const ego = egoSubgraph(allOrScoped, seed, radius);
	if (ego.length > 0) return ego;
	if (isCompHub(expandDir, seed)) {
		return hubChildrenWires(expandDir, seed, { includeSelectParms: true });
	}
	return ego;
}

/** Undirected ego subgraph: seed + nodes within `radius` hops. */
export function egoSubgraph(
	edges: WireEdge[],
	seed: string,
	radius: number,
): WireEdge[] {
	const seedNorm = seed.replace(/^[/\\]+/, "").replace(/\\/g, "/");
	const adj = new Map<string, Set<string>>();

	function link(a: string, b: string): void {
		if (!adj.has(a)) adj.set(a, new Set());
		if (!adj.has(b)) adj.set(b, new Set());
		adj.get(a)?.add(b);
		adj.get(b)?.add(a);
	}

	for (const e of edges) {
		const to = e.to;
		const from =
			e.kind === "op" ? resolveSiblingPath(e.to, e.fromName) : e.from;
		const fromNode = from.replace(/\/out\d+$/i, "").replace(/\/in\d+$/i, "");
		link(fromNode, to);
	}

	const keep = new Set<string>([seedNorm]);
	let frontier = new Set<string>([seedNorm]);
	for (let r = 0; r < radius; r += 1) {
		const next = new Set<string>();
		for (const n of frontier) {
			for (const m of adj.get(n) ?? []) {
				if (!keep.has(m)) {
					keep.add(m);
					next.add(m);
				}
			}
		}
		frontier = next;
	}

	return edges.filter((e) => {
		const to = e.to;
		const from =
			e.kind === "op" ? resolveSiblingPath(e.to, e.fromName) : e.from;
		const fromNode = from.replace(/\/out\d+$/i, "").replace(/\/in\d+$/i, "");
		return keep.has(to) || keep.has(fromNode) || keep.has(from);
	});
}

/** Node ids present in an edge list (for brief mode). */
export function nodesInEdges(edges: DigestWireEdge[]): string[] {
	const set = new Set<string>();
	for (const e of edges) {
		set.add(e.to);
		if (e.kind === "op") {
			set.add(resolveSiblingPath(e.to, e.fromName));
		} else if (e.kind === "comp") {
			set.add(e.from.replace(/\/out\d+$/i, "").replace(/\/in\d+$/i, ""));
		} else {
			set.add(e.from);
		}
	}
	return [...set].sort();
}

export function formatWireEdgesText(
	edges: DigestWireEdge[],
	maxNodes: number,
	maxChars: number,
): { text: string; truncated: boolean; omitted: number } {
	const lines: string[] = [];
	const limited = edges.slice(0, maxNodes);
	const omitted = Math.max(0, edges.length - limited.length);
	for (const e of limited) {
		if (e.kind === "op") {
			const from = resolveSiblingPath(e.to, e.fromName);
			lines.push(`${from} -> ${e.to}  # in${e.index}`);
		} else if (e.kind === "comp") {
			const conn = e.connector ? `:${e.connector}` : "";
			const fam = e.family ? ` ${e.family}` : "";
			lines.push(`${e.from} -> ${e.to}${conn}  # comp in${e.index}${fam}`);
		} else {
			lines.push(`${e.from} -> ${e.to}  # select ${e.param}`);
		}
	}
	let text = lines.join("\n");
	let truncated = omitted > 0;
	if (text.length > maxChars) {
		text = `${text.slice(0, Math.max(0, maxChars - 40))}\n… truncated by maxChars`;
		truncated = true;
	} else if (omitted > 0) {
		text = `${text}\n… truncated, ${omitted} omitted`;
	}
	return { omitted, text, truncated };
}

/** Load wires for a single node path (used by get_toe_node). */
export function wiresForNode(
	expandDir: string,
	relPath: string,
): { inputs: OpInputEdge[]; compInputs: CompInputEdge[] } {
	const inputs: OpInputEdge[] = [];
	const compInputs: CompInputEdge[] = [];
	const nBody = readTextFile(nFileForPath(expandDir, relPath));
	if (nBody) {
		for (const inp of parseNInputs(nBody)) {
			inputs.push({
				fromName: inp.name,
				index: inp.index,
				kind: "op",
				to: relPath,
			});
		}
	}
	const netBody = readTextFile(networkFileForPath(expandDir, relPath));
	if (netBody) {
		for (const inp of parseCompInputs(netBody)) {
			compInputs.push({
				connector: inp.connector,
				family: inp.family,
				from: inp.from,
				index: inp.index,
				kind: "comp",
				to: relPath,
			});
		}
	}
	return { compInputs, inputs };
}

/** Who lists `leaf` as an input in the same parent directory. */
export function findOutputs(
	expandDir: string,
	relPath: string,
): { consumer: string; index: number }[] {
	const parent = dirname(relPath);
	const leaf = basename(relPath);
	const parentAbs =
		parent === "." || parent === "" ? expandDir : join(expandDir, parent);
	if (!existsSync(parentAbs)) return [];
	const out: { consumer: string; index: number }[] = [];
	let names: string[];
	try {
		names = readdirSync(parentAbs);
	} catch {
		return [];
	}
	for (const name of names) {
		if (!name.toLowerCase().endsWith(".n")) continue;
		const consumerRel =
			parent === "." || parent === ""
				? name.slice(0, -2)
				: `${parent}/${name.slice(0, -2)}`;
		if (consumerRel === relPath) continue;
		const body = readTextFile(join(parentAbs, name));
		if (!body) continue;
		for (const inp of parseNInputs(body)) {
			if (inp.name === leaf) {
				out.push({ consumer: consumerRel, index: inp.index });
			}
		}
	}
	return out;
}

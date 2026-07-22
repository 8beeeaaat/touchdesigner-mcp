import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
	classifyRef,
	parmFileForPath,
	parseParmRows,
	type RefHit,
	readTextFile,
} from "./parseExpand.js";
import { resolveWalkMaxDepth } from "./walkDepth.js";

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

/** Scan `.parm` files under scope for reference-like values. */
export function collectRefs(
	expandDir: string,
	pathFilter: string | undefined,
	maxDepth: number,
	refKind: "opOnly" | "all" = "opOnly",
	relativeDepth?: number,
): RefHit[] {
	const filterNorm = pathFilter
		? pathFilter.replace(/^[/\\]+/, "").replace(/\\/g, "/")
		: "";
	const { walkMaxDepth } = resolveWalkMaxDepth(
		filterNorm || undefined,
		maxDepth,
		relativeDepth,
	);
	const hits: RefHit[] = [];
	const seen = new Set<string>();

	function allow(kind: RefHit["kind"]): boolean {
		if (refKind === "all") return true;
		return kind === "op" || kind === "path" || kind === "externaltox";
	}

	function add(hit: RefHit): void {
		if (!allow(hit.kind)) return;
		const key = `${hit.path}|${hit.param ?? ""}|${hit.snippet}|${hit.kind}`;
		if (seen.has(key)) return;
		seen.add(key);
		hits.push(hit);
	}

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

			if (!name.toLowerCase().endsWith(".parm")) continue;
			const nodeRel = rel.replace(/\.parm$/i, "");
			if (!passesFilter(nodeRel, filterNorm)) continue;
			const body = readTextFile(child);
			if (!body) continue;
			for (const row of parseParmRows(body)) {
				const kind = classifyRef(row.name, row.raw);
				if (!kind) continue;
				const snippet =
					row.raw.length > 160 ? `${row.raw.slice(0, 157)}…` : row.raw;
				add({
					kind,
					param: row.name,
					path: nodeRel,
					snippet: snippet || row.name,
				});
			}
		}
	}

	walk(expandDir, 0);

	// Also check exact path's parm when filter is a single node
	if (filterNorm) {
		const body = readTextFile(parmFileForPath(expandDir, filterNorm));
		if (body) {
			for (const row of parseParmRows(body)) {
				const kind = classifyRef(row.name, row.raw);
				if (!kind) continue;
				const snippet =
					row.raw.length > 160 ? `${row.raw.slice(0, 157)}…` : row.raw;
				add({
					kind,
					param: row.name,
					path: filterNorm,
					snippet: snippet || row.name,
				});
			}
		}
	}

	return hits;
}

export function formatRefsText(
	hits: RefHit[],
	maxNodes: number,
	maxChars: number,
): { text: string; truncated: boolean; omitted: number } {
	const limited = hits.slice(0, maxNodes);
	const omitted = Math.max(0, hits.length - limited.length);
	const lines = limited.map(
		(h) => `${h.path}  ${h.param ?? "-"}  [${h.kind}]  ${h.snippet}`,
	);
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

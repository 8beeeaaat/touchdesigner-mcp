import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { parmFileForPath, parseParmRows, readTextFile } from "./parseExpand.js";
import { resolveWalkMaxDepth } from "./walkDepth.js";

export type CompExtKind = "local" | "shortcut" | "other";

export type CompExtensionSlot = {
	slot: number;
	name: string;
	objectExpr: string;
	promote: boolean;
	kind: CompExtKind;
	sourceTextRel?: string;
};

export type CompExtensionGroup = {
	/** Representative host path (first sample). */
	hostPath: string;
	slot: number;
	name: string;
	objectExpr: string;
	promote: boolean;
	kind: CompExtKind;
	sourceTextRel?: string;
	count: number;
	sampleHosts: string[];
};

export type ExtensionsSummary = {
	totalHosts: number;
	uniqueExts: number;
	byKind: Record<CompExtKind, number>;
	top: { name: string; objectExpr: string; kind: CompExtKind; count: number }[];
};

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

function classifyExtObject(objectExpr: string): CompExtKind {
	const t = objectExpr.trim();
	if (/^op\s*\(\s*['"]\.\//i.test(t) || /^op\s*\(\s*['"]\.\.\//i.test(t)) {
		return "local";
	}
	if (/^op\.[A-Za-z_]\w*/.test(t)) {
		return "shortcut";
	}
	return "other";
}

/** Extract Text DAT stem from `op('./fourdesigner_ext').module...` */
function localTextStem(objectExpr: string): string | undefined {
	const m = objectExpr.match(/op\s*\(\s*['"]\.\/([^'"]+?)['"]\s*\)/i);
	if (!m) return undefined;
	return m[1].replace(/\/$/, "");
}

function resolveSourceTextRel(
	expandDir: string,
	hostPath: string,
	objectExpr: string,
): string | undefined {
	const stem = localTextStem(objectExpr);
	if (!stem) return undefined;
	const parent = dirname(hostPath);
	const parentAbs =
		parent === "." || parent === "" ? expandDir : join(expandDir, parent);
	const candidates = [
		join(parentAbs, `${basename(stem)}.text`),
		join(parentAbs, `${stem}.text`),
		join(expandDir, hostPath, `${basename(stem)}.text`),
	];
	for (const abs of candidates) {
		if (existsSync(abs)) return toRel(expandDir, abs);
	}
	// stem may be `fourdesigner_ext` sitting next to host .n
	const sibling = join(
		parent === "." || parent === "" ? expandDir : join(expandDir, parent),
		`${stem}.text`,
	);
	if (existsSync(sibling)) return toRel(expandDir, sibling);
	return undefined;
}

function parsePromote(raw: string): boolean {
	return /\bon\b/i.test(raw) && !/\boff\b/i.test(raw.split(/\s+/).pop() ?? "");
}

function extractObjectExpr(raw: string): string {
	// parm raw like: `0 op('./x').module.Foo(me)` or `256 op.TDAnnotate...`
	const m = raw.match(
		/\b(op\s*\([^)]+\)[^\s]*|op\.[A-Za-z_][\w.]*(?:\([^)]*\))?)/,
	);
	if (m) return m[1].trim();
	const parts = raw.trim().split(/\s+/);
	return parts.slice(1).join(" ").trim() || raw.trim();
}

function extractName(raw: string): string {
	const parts = raw.trim().split(/\s+/);
	const last = parts[parts.length - 1] ?? "";
	if (last === '""' || last === "''") return "";
	return last.replace(/^["']|["']$/g, "");
}

/**
 * Collect COMP Python Exts (`extNobject` / name / promote) under an expand tree.
 * Groups identical objectExpr+name to avoid Annotate spam.
 */
export function collectCompExtensions(
	expandDir: string,
	pathFilter?: string,
	maxDepth = 32,
	relativeDepth?: number,
): {
	extensions: CompExtensionGroup[];
	summary: ExtensionsSummary;
} {
	const filterNorm = pathFilter
		? pathFilter.replace(/^[/\\]+/, "").replace(/\\/g, "/")
		: "";
	const { walkMaxDepth } = resolveWalkMaxDepth(
		filterNorm || undefined,
		maxDepth,
		relativeDepth,
	);

	type HostExt = {
		hostPath: string;
		slots: Map<number, Partial<CompExtensionSlot> & { slot: number }>;
	};
	const hosts: HostExt[] = [];

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
			if (filterNorm) {
				if (nodeRel !== filterNorm && !nodeRel.startsWith(`${filterNorm}/`)) {
					continue;
				}
			}
			const body = readTextFile(child);
			if (!body) continue;
			const rows = parseParmRows(body);
			const slots = new Map<
				number,
				Partial<CompExtensionSlot> & { slot: number }
			>();
			for (const row of rows) {
				const m = row.name.match(/^ext(\d+)(object|name|promote)$/i);
				if (!m) continue;
				const slot = Number(m[1]);
				const field = m[2].toLowerCase();
				const cur = slots.get(slot) ?? { slot };
				if (field === "object") {
					cur.objectExpr = extractObjectExpr(row.raw);
				} else if (field === "name") {
					cur.name = extractName(row.raw);
				} else if (field === "promote") {
					cur.promote = parsePromote(row.raw);
				}
				slots.set(slot, cur);
			}
			if (slots.size === 0) continue;
			hosts.push({ hostPath: nodeRel, slots });
		}
	}

	walk(expandDir, 0);

	const groups = new Map<string, CompExtensionGroup>();
	let totalHosts = 0;

	for (const host of hosts) {
		let hostHasExt = false;
		for (const partial of host.slots.values()) {
			if (!partial.objectExpr) continue;
			hostHasExt = true;
			const objectExpr = partial.objectExpr;
			const name = partial.name ?? "";
			const kind = classifyExtObject(objectExpr);
			const promote = partial.promote ?? false;
			const sourceTextRel =
				kind === "local"
					? resolveSourceTextRel(expandDir, host.hostPath, objectExpr)
					: undefined;
			const key = `${partial.slot}|${name}|${objectExpr}`;
			const existing = groups.get(key);
			if (existing) {
				existing.count += 1;
				if (existing.sampleHosts.length < 5) {
					existing.sampleHosts.push(host.hostPath);
				}
			} else {
				groups.set(key, {
					count: 1,
					hostPath: host.hostPath,
					kind,
					name,
					objectExpr,
					promote,
					sampleHosts: [host.hostPath],
					slot: partial.slot,
					sourceTextRel,
				});
			}
		}
		if (hostHasExt) totalHosts += 1;
	}

	const extensions = [...groups.values()].sort((a, b) => {
		if (b.count !== a.count) return b.count - a.count;
		return a.objectExpr.localeCompare(b.objectExpr);
	});

	const byKind: Record<CompExtKind, number> = {
		local: 0,
		other: 0,
		shortcut: 0,
	};
	for (const g of extensions) {
		byKind[g.kind] += 1;
	}

	const summary: ExtensionsSummary = {
		byKind,
		top: extensions.slice(0, 12).map((g) => ({
			count: g.count,
			kind: g.kind,
			name: g.name || `(slot ${g.slot})`,
			objectExpr: g.objectExpr,
		})),
		totalHosts,
		uniqueExts: extensions.length,
	};

	return { extensions, summary };
}

/** Ext slots on a single host COMP (for get_toe_node). */
export function extensionsForNode(
	expandDir: string,
	hostPath: string,
): CompExtensionSlot[] {
	const body = readTextFile(parmFileForPath(expandDir, hostPath));
	if (!body) return [];
	const rows = parseParmRows(body);
	const slots = new Map<
		number,
		Partial<CompExtensionSlot> & { slot: number }
	>();
	for (const row of rows) {
		const m = row.name.match(/^ext(\d+)(object|name|promote)$/i);
		if (!m) continue;
		const slot = Number(m[1]);
		const field = m[2].toLowerCase();
		const cur = slots.get(slot) ?? { slot };
		if (field === "object") cur.objectExpr = extractObjectExpr(row.raw);
		else if (field === "name") cur.name = extractName(row.raw);
		else if (field === "promote") cur.promote = parsePromote(row.raw);
		slots.set(slot, cur);
	}
	const out: CompExtensionSlot[] = [];
	for (const partial of [...slots.values()].sort((a, b) => a.slot - b.slot)) {
		if (!partial.objectExpr) continue;
		const kind = classifyExtObject(partial.objectExpr);
		out.push({
			kind,
			name: partial.name ?? "",
			objectExpr: partial.objectExpr,
			promote: partial.promote ?? false,
			slot: partial.slot,
			sourceTextRel:
				kind === "local"
					? resolveSourceTextRel(expandDir, hostPath, partial.objectExpr)
					: undefined,
		});
	}
	return out;
}

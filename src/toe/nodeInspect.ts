import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureExpandedToe } from "./expandCache.js";
import {
	type ExpandLocator,
	suggestedOpPath,
	toExpandLocator,
} from "./expandLocator.js";
import { type CompExtensionSlot, extensionsForNode } from "./extensions.js";
import {
	type ExpandFileEntry,
	readExpandFileBody,
	sidecarsForNode,
} from "./filesInventory.js";
import {
	networkFileForPath,
	nFileForPath,
	type ParmRow,
	parmFileForPath,
	parseParmRows,
	readOpHintFromN,
	readTextFile,
	resolveSiblingPath,
	textFileForPath,
} from "./parseExpand.js";
import {
	collectWireEdges,
	findOutputs,
	formatWireEdgesText,
	isCompHub,
	resolveWiresForSeed,
	wiresForNode,
} from "./wires.js";

export type NodeInclude =
	| "inputs"
	| "outputs"
	| "parms"
	| "text"
	| "meta"
	| "files"
	| "raw"
	| "wires"
	| "children";

export type NodeProfile = "summary" | "deep";

export type ToeNodeChild = {
	relPath: string;
	kind: "dir" | "node";
	opHint?: string;
};

export type ToeNodeResult = {
	schema_version: 1;
	alpha: true;
	toePath: string;
	path: string;
	suggestedOpPath: string;
	expand: ExpandLocator;
	cacheHit: boolean;
	opHint?: string;
	inputs?: { index: number; from: string; fromName: string }[];
	compInputs?: {
		index: number;
		from: string;
		connector?: string;
		family?: string;
	}[];
	outputs?: { consumer: string; index: number }[];
	parms?: { name: string; raw: string; isExpr: boolean }[];
	text?: string;
	meta?: { tile?: string; flags?: string; cookOff?: boolean };
	/** COMP Python Ext slots (ext0…), not TD Preferences packages. */
	extension?: { slots: CompExtensionSlot[] };
	children?: ToeNodeChild[];
	files?: ExpandFileEntry[];
	raw?: {
		n?: { abs: string; body: string };
		parm?: { abs: string; body: string };
		text?: { abs: string; body: string };
		network?: { abs: string; body: string };
		file?: {
			abs: string;
			rel: string;
			body?: string;
			binary?: boolean;
			bytes?: number;
			sha256?: string;
		};
	};
	wires?: string;
	truncated: boolean;
	warnings: string[];
};

export type ToeNodeOptions = {
	toePath: string;
	path: string;
	include?: NodeInclude[];
	profile?: NodeProfile;
	/** Sidecar basename or expand-relative file under expandDir. */
	file?: string;
	maxParms?: number;
	maxChars?: number;
	maxNodes?: number;
	refresh?: boolean;
	tdExe?: string;
};

const SUMMARY_INCLUDE: NodeInclude[] = ["inputs", "parms"];
const DEEP_INCLUDE: NodeInclude[] = [
	"inputs",
	"outputs",
	"parms",
	"files",
	"raw",
	"wires",
	"children",
	"meta",
];

function listImmediateChildren(
	expandDir: string,
	relPath: string,
): ToeNodeChild[] {
	const dirAbs = join(expandDir, relPath);
	if (!existsSync(dirAbs) || !statSync(dirAbs).isDirectory()) return [];
	let names: string[];
	try {
		names = readdirSync(dirAbs).sort();
	} catch {
		return [];
	}
	const out: ToeNodeChild[] = [];
	for (const name of names) {
		if (name.startsWith(".")) continue;
		const childAbs = join(dirAbs, name);
		let st: ReturnType<typeof statSync>;
		try {
			st = statSync(childAbs);
		} catch {
			continue;
		}
		if (st.isDirectory()) {
			const childRel = `${relPath}/${name}`;
			const nBody = readTextFile(nFileForPath(expandDir, childRel));
			out.push({
				kind: "dir",
				opHint: nBody ? readOpHintFromN(nBody) : undefined,
				relPath: childRel,
			});
			continue;
		}
		if (!name.toLowerCase().endsWith(".n")) continue;
		const stem = name.slice(0, -2);
		const twin = join(dirAbs, stem);
		if (existsSync(twin) && statSync(twin).isDirectory()) continue;
		const childRel = `${relPath}/${stem}`;
		const nBody = readTextFile(childAbs);
		out.push({
			kind: "node",
			opHint: nBody ? readOpHintFromN(nBody) : undefined,
			relPath: childRel,
		});
	}
	return out;
}

/**
 * Deep inspect of a single expand-relative node/COMP (alpha).
 */
export async function getToeNode(opts: ToeNodeOptions): Promise<ToeNodeResult> {
	const relPath = opts.path.replace(/^[/\\]+/, "").replace(/\\/g, "/");
	const profile = opts.profile ?? "summary";
	const include = new Set(
		opts.include?.length
			? opts.include
			: profile === "deep"
				? DEEP_INCLUDE
				: SUMMARY_INCLUDE,
	);
	const maxParms = opts.maxParms ?? 40;
	const maxChars = opts.maxChars ?? 4000;
	const maxNodes = opts.maxNodes ?? 80;
	const warnings: string[] = [
		"paths_are_expand_relative_not_guaranteed_op_paths",
		"alpha_get_toe_node",
	];

	const expanded = await ensureExpandedToe({
		refresh: opts.refresh,
		tdExe: opts.tdExe,
		toePath: opts.toePath,
	});
	warnings.push(...expanded.warnings);

	const nBody = readTextFile(nFileForPath(expanded.expandDir, relPath));
	const parmBody = readTextFile(parmFileForPath(expanded.expandDir, relPath));
	if (!nBody && !parmBody) {
		warnings.push("node_not_found_in_expand");
	}

	const result: ToeNodeResult = {
		alpha: true,
		cacheHit: expanded.cacheHit,
		expand: toExpandLocator(expanded),
		path: relPath,
		schema_version: 1,
		suggestedOpPath: suggestedOpPath(relPath),
		toePath: expanded.toePath,
		truncated: false,
		warnings,
	};

	if (nBody) {
		result.opHint = readOpHintFromN(nBody);
		if (include.has("meta")) {
			const tile = nBody.match(/^tile\s+(.+)$/m)?.[1]?.trim();
			const flags = nBody.match(/^flags\s*=\s*(.+)$/m)?.[1]?.trim();
			const cookOff = Boolean(flags && /\bcook\s+off\b/i.test(flags));
			result.meta = { cookOff, flags, tile };
		}
	}

	const extSlots = extensionsForNode(expanded.expandDir, relPath);
	if (extSlots.length) {
		result.extension = { slots: extSlots };
	}

	if (include.has("children") && isCompHub(expanded.expandDir, relPath)) {
		result.children = listImmediateChildren(expanded.expandDir, relPath);
	}

	if (include.has("inputs")) {
		const { inputs, compInputs } = wiresForNode(expanded.expandDir, relPath);
		result.inputs = inputs.map((e) => ({
			from: resolveSiblingPath(e.to, e.fromName),
			fromName: e.fromName,
			index: e.index,
		}));
		if (compInputs.length) {
			result.compInputs = compInputs.map((e) => ({
				connector: e.connector,
				family: e.family,
				from: e.from,
				index: e.index,
			}));
		}
	}

	if (include.has("outputs")) {
		result.outputs = findOutputs(expanded.expandDir, relPath);
	}

	if (include.has("parms") && parmBody) {
		const rows = parseParmRows(parmBody);
		const sliced = rows.slice(0, maxParms);
		result.parms = sliced.map((r: ParmRow) => ({
			isExpr: r.isExpr,
			name: r.name,
			raw: r.raw.length > 200 ? `${r.raw.slice(0, 197)}…` : r.raw,
		}));
		if (rows.length > maxParms) {
			result.truncated = true;
			warnings.push(`parms_truncated:${rows.length - maxParms}_omitted`);
		}
	}

	if (include.has("text")) {
		const text = readTextFile(textFileForPath(expanded.expandDir, relPath));
		if (text) {
			result.text =
				text.length > maxChars
					? `${text.slice(0, maxChars)}\n… truncated`
					: text;
			if (text.length > maxChars) result.truncated = true;
		}
	}

	if (include.has("files")) {
		result.files = sidecarsForNode(expanded.expandDir, relPath);
	}

	if (include.has("raw")) {
		result.raw = {};
		const nAbs = nFileForPath(expanded.expandDir, relPath);
		const pAbs = parmFileForPath(expanded.expandDir, relPath);
		const tAbs = textFileForPath(expanded.expandDir, relPath);
		const netAbs = networkFileForPath(expanded.expandDir, relPath);
		if (nBody) {
			result.raw.n = {
				abs: nAbs,
				body:
					nBody.length > maxChars
						? `${nBody.slice(0, maxChars)}\n… truncated`
						: nBody,
			};
			if (nBody.length > maxChars) result.truncated = true;
		}
		if (parmBody) {
			result.raw.parm = {
				abs: pAbs,
				body:
					parmBody.length > maxChars
						? `${parmBody.slice(0, maxChars)}\n… truncated`
						: parmBody,
			};
			if (parmBody.length > maxChars) result.truncated = true;
		}
		const textBody = readTextFile(tAbs);
		if (textBody) {
			result.raw.text = {
				abs: tAbs,
				body:
					textBody.length > maxChars
						? `${textBody.slice(0, maxChars)}\n… truncated`
						: textBody,
			};
			if (textBody.length > maxChars) result.truncated = true;
		}
		const netBody = readTextFile(netAbs);
		if (netBody) {
			result.raw.network = {
				abs: netAbs,
				body:
					netBody.length > maxChars
						? `${netBody.slice(0, maxChars)}\n… truncated`
						: netBody,
			};
			if (netBody.length > maxChars) result.truncated = true;
		}
	}

	if (opts.file) {
		const parentAbs = join(
			expanded.expandDir,
			dirname(relPath) === "." ? "" : dirname(relPath),
		);
		const loaded = readExpandFileBody(expanded.expandDir, opts.file, {
			baseDir: parentAbs || expanded.expandDir,
			maxChars,
		});
		result.raw = result.raw ?? {};
		result.raw.file = {
			abs: loaded.abs,
			binary: loaded.binary,
			body: loaded.body,
			bytes: loaded.bytes,
			rel: loaded.rel,
			sha256: loaded.sha256,
		};
		if (loaded.truncated) result.truncated = true;
	}

	if (include.has("wires")) {
		const parentScope = relPath.includes("/")
			? relPath.slice(0, relPath.lastIndexOf("/"))
			: undefined;
		const scoped = collectWireEdges(expanded.expandDir, parentScope, 8);
		const edges = resolveWiresForSeed(expanded.expandDir, scoped, relPath, 1);
		const formatted = formatWireEdgesText(edges, maxNodes, maxChars);
		result.wires = formatted.text;
		if (formatted.truncated) result.truncated = true;
	}

	return result;
}

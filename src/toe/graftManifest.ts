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
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { templateRoot } from "../core/lifecycle.js";
import { expandToeInPlace } from "./collapseToe.js";

const GRAFT_CACHE_ROOT = join(tmpdir(), "tdmcp-inject-graft");
/** Live graft COMP name (avoid legacy `mcp_webserver_base` — collides on many community toes). */
const BRIDGE_STEM = "project1/tdmcp_bridge";
const ONSTART_STEM = "project1/tdmcp_port_onstart";
const BRIDGE_NAME = "tdmcp_bridge";
const ONSTART_NAME = "tdmcp_port_onstart";
/** Pre-rename COMP name — still wiped on replace so old injects can upgrade. */
const LEGACY_BRIDGE_NAME = "mcp_webserver_base";

/**
 * Historical sidecar names. Inject/create must NOT stage these beside the
 * embedded bridge COMP: TD pops "unexpected node name duplication" when a
 * project-dir `.tox` root op collides with an embedded COMP. Modules resolve
 * via `project.folder + '/modules'`.
 */
export const BRIDGE_TOX_SIDECAR = "tdmcp_bridge.tox";
/** Tox filenames that must be removed from the project root (not modules/). */
export const BRIDGE_TOX_SOURCE_NAMES = [
	"tdmcp_bridge.tox",
	"mcp_webserver_base.tox",
] as const;
/**
 * Safe tox location for runtime `loadTox` during inject. Project-root
 * `tdmcp_bridge.tox` collides with an embedded COMP of the same name; under
 * `modules/` it does not.
 */
export const MODULES_BRIDGE_TOX_REL = "modules/tdmcp_bridge.tox";

/** Embedded Text DAT path for import_modules inside the grafted bridge COMP. */
export const IMPORT_MODULES_TEXT_REL =
	"project1/tdmcp_bridge/import_modules.text";
/** Execute DAT text path for port/onStart bootstrap. */
export const ONSTART_TEXT_REL = "project1/tdmcp_port_onstart.text";

/**
 * TD Text/Script DAT on-disk layout: 27-byte header, then payload.
 * Bytes 25-26 are big-endian uint16 payload length.
 */
export function writeTdTextDat(filePath: string, pythonSource: string): void {
	const payload = Buffer.from(pythonSource, "utf8");
	if (payload.length > 0xffff) {
		throw new Error(
			`writeTdTextDat: payload too large (${payload.length} > 65535)`,
		);
	}
	let header: Buffer;
	if (existsSync(filePath)) {
		const prev = readFileSync(filePath);
		if (prev.length >= 27 && prev[0] === 0x32 && prev[1] === 0x0a) {
			header = Buffer.from(prev.subarray(0, 27));
		} else {
			header = Buffer.alloc(27);
			header[0] = 0x32; // '2'
			header[1] = 0x0a;
			header[2] = 0x2a; // '*'
			header[22] = 0x02;
		}
	} else {
		header = Buffer.alloc(27);
		header[0] = 0x32;
		header[1] = 0x0a;
		header[2] = 0x2a;
		header[22] = 0x02;
	}
	header[25] = (payload.length >> 8) & 0xff;
	header[26] = payload.length & 0xff;
	writeFileSync(filePath, Buffer.concat([header, payload]));
}

export function readTdTextDatPayload(filePath: string): string {
	const buf = readFileSync(filePath);
	if (buf.length >= 27 && buf[0] === 0x32 && buf[1] === 0x0a) {
		const claimed = (buf[25] << 8) | buf[26];
		const start = 27;
		const end = Math.min(buf.length, start + claimed);
		return buf.subarray(start, end).toString("utf8");
	}
	return buf.toString("utf8");
}

/** Relative expand paths owned by the MCP graft (posix). */
export type GraftManifest = {
	paths: string[];
	kitExpandDir: string;
	templateToePath: string;
	templateHash: string;
};

export type ConflictState = "absent" | "full" | "partial";

export type ConflictInfo = {
	state: ConflictState;
	presentPaths: string[];
	missingManifestPaths: string[];
	extraUnderStem: string[];
	/** Case-variant or colliding names under project1 (e.g. MCP_webserver_base). */
	nameCollisions: string[];
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

function toPosix(p: string): string {
	return p.split(sep).join("/");
}

function normKey(s: string): string {
	return s.replace(/\\/g, "/").toLowerCase();
}

/** Node op name from an expand basename: `foo.n` / `foo.parm` / dir `foo` → `foo`. */
export function nodeNameFromEntry(entryName: string): string {
	if (entryName.includes(".")) {
		return entryName.slice(0, entryName.indexOf("."));
	}
	return entryName;
}

function isReservedBridgeName(name: string): boolean {
	const n = name.toLowerCase();
	return (
		n === BRIDGE_NAME ||
		n === LEGACY_BRIDGE_NAME ||
		n === ONSTART_NAME
	);
}

function isGraftOwnedRel(rel: string): boolean {
	const r = normKey(rel);
	const bridge = normKey(BRIDGE_STEM);
	const legacy = normKey(`project1/${LEGACY_BRIDGE_NAME}`);
	const onstart = normKey(ONSTART_STEM);
	return (
		r === bridge ||
		r.startsWith(`${bridge}.`) ||
		r.startsWith(`${bridge}/`) ||
		r === legacy ||
		r.startsWith(`${legacy}.`) ||
		r.startsWith(`${legacy}/`) ||
		r === onstart ||
		r.startsWith(`${onstart}.`)
	);
}

/** True for `tdmcp_port_onstart` expand paths (not the bridge COMP). */
export function isOnstartRel(rel: string): boolean {
	const r = normKey(rel);
	const onstart = normKey(ONSTART_STEM);
	return r === onstart || r.startsWith(`${onstart}.`);
}

/** Kit manifest paths that belong to the onStart Execute DAT only. */
export function filterOnstartPaths(manifestPaths: string[]): string[] {
	return manifestPaths.filter((p) => isOnstartRel(p));
}

export function modulesBridgeToxPath(projectDir: string): string {
	return join(projectDir, ...MODULES_BRIDGE_TOX_REL.split("/"));
}

function isGraftOwnedProject1Entry(entryName: string): boolean {
	const base = nodeNameFromEntry(entryName).toLowerCase();
	return isReservedBridgeName(base);
}

/** Walk expand dir and list graft-owned relative paths from a kit expand. */
export function discoverGraftPaths(kitExpandDir: string): string[] {
	const out: string[] = [];
	function walk(abs: string): void {
		for (const name of readdirSync(abs)) {
			if (name === "." || name === "..") continue;
			const child = join(abs, name);
			const rel = toPosix(relative(kitExpandDir, child));
			const st = statSync(child);
			if (st.isDirectory()) {
				if (rel === "project1" || isGraftOwnedRel(rel)) {
					walk(child);
				}
				continue;
			}
			if (isGraftOwnedRel(rel)) {
				out.push(rel);
			}
		}
	}
	const project1 = join(kitExpandDir, "project1");
	if (!existsSync(project1)) {
		throw new Error(`graft kit missing project1 at ${kitExpandDir}`);
	}
	walk(kitExpandDir);
	out.sort();
	if (out.length === 0) {
		throw new Error(
			`graft kit has no mcp_webserver_base / tdmcp_port_onstart files under ${kitExpandDir}`,
		);
	}
	return out;
}

/**
 * Expand template project.toe into a hash-keyed cache; return manifest paths.
 */
export async function ensureGraftKit(params?: {
	tdExe?: string;
	timeoutMs?: number;
}): Promise<GraftManifest> {
	const templateToePath = join(templateRoot(), "project.toe");
	if (!existsSync(templateToePath)) {
		throw new Error(`MCP template toe not found: ${templateToePath}`);
	}
	const templateHash = await sha256File(templateToePath);
	const cacheDir = join(GRAFT_CACHE_ROOT, templateHash);
	const cachedToe = join(cacheDir, "project.toe");
	const kitExpandDir = `${cachedToe}.dir`;
	const metaPath = join(cacheDir, "manifest.json");

	if (existsSync(kitExpandDir) && existsSync(metaPath)) {
		const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
			paths: string[];
		};
		return {
			kitExpandDir,
			paths: meta.paths,
			templateHash,
			templateToePath,
		};
	}

	mkdirSync(cacheDir, { recursive: true });
	cpSync(templateToePath, cachedToe);
	await expandToeInPlace({
		tdExe: params?.tdExe,
		timeoutMs: params?.timeoutMs,
		toePath: cachedToe,
	});
	const paths = discoverGraftPaths(kitExpandDir);
	writeFileSync(
		metaPath,
		`${JSON.stringify({ paths, templateHash }, null, 2)}\n`,
	);
	return { kitExpandDir, paths, templateHash, templateToePath };
}

function pathExistsInExpand(expandDir: string, rel: string): boolean {
	return existsSync(join(expandDir, ...rel.split("/")));
}

/** Case-insensitive existence under project1 for a reserved stem. */
function findProject1EntriesByStem(
	expandDir: string,
	stemName: string,
): string[] {
	const project1 = join(expandDir, "project1");
	if (!existsSync(project1)) return [];
	const want = stemName.toLowerCase();
	const hits: string[] = [];
	for (const name of readdirSync(project1)) {
		if (nodeNameFromEntry(name).toLowerCase() === want) {
			hits.push(`project1/${name}`);
		}
	}
	return hits;
}

export type SiblingNameDuplicate = {
	/** Expand-relative parent network path (posix), e.g. `project1` or `project1/Box_Fillet`. */
	parent: string;
	/** Lowercased op name key. */
	nameKey: string;
	/** Distinct spellings / .n paths involved. */
	entries: string[];
	detail: string;
};

/**
 * Case-variant spellings of the same op under project1 (filesystem basenames).
 * Multiple sidecars (.n/.parm/dir) for one spelling are normal — not a duplicate.
 */
export function findDuplicateNodeNames(expandDir: string): string[] {
	return findSiblingNameDuplicates(expandDir)
		.filter((d) => d.parent === "project1" && d.entries.length > 1)
		.filter((d) => {
			const spellings = new Set(
				d.entries.map((e) => nodeNameFromEntry(e.split("/").pop()!)),
			);
			return spellings.size > 1;
		})
		.map((d) => {
			const spellings = [
				...new Set(
					d.entries.map((e) => nodeNameFromEntry(e.split("/").pop()!)),
				),
			].sort();
			return spellings.join("|");
		});
}

/**
 * Sibling operator collisions: more than one `.n` for the same name under one parent,
 * or distinct case spellings of the same key. Walks the whole expand tree.
 */
export function findSiblingNameDuplicates(
	expandDir: string,
): SiblingNameDuplicate[] {
	const out: SiblingNameDuplicate[] = [];
	const walk = (absDir: string, parentRel: string): void => {
		if (!existsSync(absDir)) return;
		const byKey = new Map<string, string[]>();
		for (const name of readdirSync(absDir)) {
			if (name.startsWith(".")) continue;
			const child = join(absDir, name);
			const st = statSync(child);
			if (st.isDirectory()) {
				const childRel = parentRel ? `${parentRel}/${name}` : name;
				walk(child, childRel);
				continue;
			}
			if (!name.endsWith(".n")) continue;
			const opName = name.slice(0, -2);
			const key = opName.toLowerCase();
			const rel = parentRel
				? `${parentRel}/${name}`
				: name;
			const list = byKey.get(key) ?? [];
			list.push(rel);
			byKey.set(key, list);
		}
		for (const [nameKey, entries] of byKey) {
			if (entries.length <= 1) continue;
			out.push({
				detail: `sibling .n x${entries.length} under ${parentRel || "."}: ${entries.join(", ")}`,
				entries,
				nameKey,
				parent: parentRel || ".",
			});
		}
		// Case-variant spellings via non-.n entries (COMP dir + differently cased .n)
		const spellings = new Map<string, Set<string>>();
		for (const name of readdirSync(absDir)) {
			if (name.startsWith(".")) continue;
			const opName = nodeNameFromEntry(name);
			const key = opName.toLowerCase();
			let set = spellings.get(key);
			if (!set) {
				set = new Set();
				spellings.set(key, set);
			}
			set.add(opName);
		}
		for (const [nameKey, names] of spellings) {
			if (names.size <= 1) continue;
			const already = out.some(
				(d) => d.parent === (parentRel || ".") && d.nameKey === nameKey,
			);
			if (already) continue;
			const entries = [...names]
				.sort()
				.map((n) => (parentRel ? `${parentRel}/${n}` : n));
			out.push({
				detail: `case-variant op names under ${parentRel || "."}: ${[...names].sort().join(" | ")}`,
				entries,
				nameKey,
				parent: parentRel || ".",
			});
		}
	};
	walk(expandDir, "");
	return out;
}

export type ToxNameCollision = {
	toxPath: string;
	toxStem: string;
	opPaths: string[];
	detail: string;
};

/**
 * `.tox` files in the project folder whose stem matches an operator name in the
 * expand (TD popup title is often `/project1/<stem>`).
 */
export function findToxNameCollisions(
	projectDir: string,
	expandDir: string,
): ToxNameCollision[] {
	if (!existsSync(projectDir) || !existsSync(expandDir)) return [];
	const toxStems = new Map<string, string>();
	for (const name of readdirSync(projectDir)) {
		if (!name.toLowerCase().endsWith(".tox")) continue;
		const stem = name.slice(0, -4);
		toxStems.set(stem.toLowerCase(), join(projectDir, name));
	}
	if (toxStems.size === 0) return [];

	const opHits = new Map<string, string[]>();
	const walk = (absDir: string, parentRel: string): void => {
		for (const name of readdirSync(absDir)) {
			if (name.startsWith(".")) continue;
			const child = join(absDir, name);
			const st = statSync(child);
			const opName = nodeNameFromEntry(name);
			const key = opName.toLowerCase();
			if (toxStems.has(key)) {
				const rel = parentRel ? `${parentRel}/${opName}` : opName;
				const list = opHits.get(key) ?? [];
				if (!list.includes(rel)) list.push(rel);
				opHits.set(key, list);
			}
			if (st.isDirectory()) {
				walk(child, parentRel ? `${parentRel}/${name}` : name);
			}
		}
	};
	walk(expandDir, "");

	const out: ToxNameCollision[] = [];
	for (const [key, toxPath] of toxStems) {
		const opPaths = opHits.get(key);
		if (!opPaths?.length) continue;
		const toxStem = basename(toxPath).slice(0, -4);
		out.push({
			detail:
				`TOX_NAME_COLLISION: ${basename(toxPath)} collides with op(s) ${opPaths.map((p) => `/${p}`).join(", ")}. ` +
				`TD shows "unexpected node name duplication" for /${opPaths[0]}. ` +
				`Stage the sidecar as ${BRIDGE_TOX_SIDECAR} (not ${BRIDGE_NAME}.tox).`,
			opPaths,
			toxPath,
			toxStem,
		});
	}
	return out;
}

export type ToeBuildReport = {
	ok: boolean;
	tocDuplicates: string[];
	siblingDuplicates: SiblingNameDuplicate[];
	toxCollisions: ToxNameCollision[];
	errors: string[];
};

/**
 * Pre-collapse / pre-open toe build check: toc dups, sibling op names, tox↔op collisions.
 */
export function inspectToeBuild(params: {
	expandDir: string;
	tocPath: string;
	projectDir?: string;
}): ToeBuildReport {
	const tocDuplicates = existsSync(params.tocPath)
		? findDuplicateTocLines(params.tocPath)
		: [];
	const siblingDuplicates = findSiblingNameDuplicates(params.expandDir);
	const toxCollisions = params.projectDir
		? findToxNameCollisions(params.projectDir, params.expandDir)
		: [];
	const errors: string[] = [];
	for (const t of tocDuplicates) {
		errors.push(`TOC_DUPLICATE: ${t}`);
	}
	for (const s of siblingDuplicates) {
		errors.push(`NODE_NAME_DUPLICATE: ${s.detail}`);
	}
	for (const c of toxCollisions) {
		errors.push(c.detail);
	}
	return {
		errors,
		ok: errors.length === 0,
		siblingDuplicates,
		tocDuplicates,
		toxCollisions,
	};
}

/**
 * Throws with a detailed multi-line message if toe build checks fail.
 */
export function assertToeBuildClean(params: {
	expandDir: string;
	tocPath: string;
	projectDir?: string;
}): ToeBuildReport {
	dedupeToc(params.tocPath);
	const report = inspectToeBuild(params);
	if (report.ok) return report;
	const head =
		report.toxCollisions.length > 0
			? "TOX_NAME_COLLISION"
			: report.siblingDuplicates.length > 0
				? "NODE_NAME_DUPLICATE"
				: "TOC_DUPLICATE";
	throw new Error(
		`${head}: toe build check failed (${report.errors.length} issue(s))\n` +
			report.errors.map((e) => `  - ${e}`).join("\n"),
	);
}

/** Duplicate (case-insensitive) lines in a .toc — collapse can emit name duplication. */
export function findDuplicateTocLines(tocPath: string): string[] {
	const text = readFileSync(tocPath, "utf8");
	const seen = new Map<string, string>();
	const dups: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		const t = line.trim();
		if (!t) continue;
		const key = normKey(t);
		if (seen.has(key) && seen.get(key) !== t) {
			dups.push(`${seen.get(key)} / ${t}`);
		} else if (seen.has(key)) {
			dups.push(t);
		} else {
			seen.set(key, t);
		}
	}
	return dups;
}

/** Rewrite .toc with unique lines (first wins), preserving newline style. */
export function dedupeToc(tocPath: string): { removed: number } {
	const text = readFileSync(tocPath, "utf8");
	const nl = detectNewline(text);
	const lines = text.split(/\r?\n/);
	const seen = new Set<string>();
	const kept: string[] = [];
	let removed = 0;
	for (const line of lines) {
		const t = line.trim();
		if (!t) {
			kept.push(line);
			continue;
		}
		const key = normKey(t);
		if (seen.has(key)) {
			removed += 1;
			continue;
		}
		seen.add(key);
		kept.push(t);
	}
	let out = kept.filter((l, i, arr) => {
		// drop runs of empty lines at end clutter — keep structure simple
		return !(l.trim() === "" && i === arr.length - 1 && arr.length > 1);
	}).join(nl);
	if (!out.endsWith("\n")) out += nl;
	writeFileSync(tocPath, out, "utf8");
	return { removed };
}

/** Detect bridge presence vs graft manifest (case-insensitive stems). */
export function detectBridgeConflict(
	expandDir: string,
	manifestPaths: string[],
	projectDir?: string,
): ConflictInfo {
	const bridgeHits = findProject1EntriesByStem(expandDir, BRIDGE_NAME);
	const onStartHits = findProject1EntriesByStem(expandDir, ONSTART_NAME);
	const hasBridge = bridgeHits.length > 0;
	const hasOnStart = onStartHits.length > 0;
	const hasModulesTox = Boolean(
		projectDir && existsSync(modulesBridgeToxPath(projectDir)),
	);
	const onstartPaths = filterOnstartPaths(manifestPaths);
	const onstartPresent = onstartPaths.filter((p) =>
		pathExistsInExpand(expandDir, p),
	);
	const onstartMissing = onstartPaths.filter(
		(p) => !pathExistsInExpand(expandDir, p),
	);

	const presentPaths = manifestPaths.filter((p) =>
		pathExistsInExpand(expandDir, p),
	);
	const missingManifestPaths = manifestPaths.filter(
		(p) => !pathExistsInExpand(expandDir, p),
	);

	const extraUnderStem: string[] = [];
	const project1 = join(expandDir, "project1");
	if (existsSync(project1)) {
		const manifestSet = new Set(manifestPaths.map(normKey));
		const collectExtra = (abs: string): void => {
			for (const name of readdirSync(abs)) {
				const child = join(abs, name);
				const rel = toPosix(relative(expandDir, child));
				if (!isGraftOwnedRel(rel)) continue;
				if (statSync(child).isDirectory()) {
					collectExtra(child);
				} else if (!manifestSet.has(normKey(rel))) {
					extraUnderStem.push(rel);
				}
			}
		};
		collectExtra(project1);
	}

	const nameCollisions: string[] = [];
	for (const hit of [...bridgeHits, ...onStartHits]) {
		const base = nodeNameFromEntry(hit.split("/").pop()!);
		if (base !== BRIDGE_NAME && base !== ONSTART_NAME) {
			nameCollisions.push(hit);
		}
	}
	nameCollisions.push(...findDuplicateNodeNames(expandDir));

	const emptyConflict = {
		extraUnderStem,
		nameCollisions: [...new Set(nameCollisions)],
		missingManifestPaths: [...manifestPaths],
		presentPaths: [] as string[],
	};

	if (!hasBridge && !hasOnStart && presentPaths.length === 0) {
		return { ...emptyConflict, state: "absent" };
	}

	// Embedded bridge (create_td_project / old inject) — full kit present.
	if (hasBridge && hasOnStart && missingManifestPaths.length === 0) {
		return {
			extraUnderStem,
			nameCollisions: [...new Set(nameCollisions)],
			missingManifestPaths: [],
			presentPaths,
			state: "full",
		};
	}

	// Runtime inject: onStart + modules/tdmcp_bridge.tox (bridge COMP loaded on open).
	if (
		hasOnStart &&
		onstartMissing.length === 0 &&
		(hasModulesTox || hasBridge)
	) {
		return {
			extraUnderStem,
			nameCollisions: [...new Set(nameCollisions)],
			missingManifestPaths,
			presentPaths: onstartPresent,
			state: "full",
		};
	}

	return {
		extraUnderStem,
		nameCollisions: [...new Set(nameCollisions)],
		missingManifestPaths,
		presentPaths,
		state: "partial",
	};
}

/**
 * Delete every project1 entry whose op name is a reserved bridge stem
 * (case-insensitive), plus matching .toc lines.
 */
export function wipeGraftOwned(
	expandDir: string,
	tocPath: string,
	manifestPaths: string[],
): void {
	const project1 = join(expandDir, "project1");
	if (existsSync(project1)) {
		// Snapshot names first — deleting while iterating is unsafe on some FS
		const names = readdirSync(project1);
		for (const name of names) {
			if (!isGraftOwnedProject1Entry(name)) continue;
			rmSync(join(project1, name), { force: true, recursive: true });
		}
	}
	for (const rel of manifestPaths) {
		const abs = join(expandDir, ...rel.split("/"));
		if (existsSync(abs)) {
			rmSync(abs, { force: true, recursive: true });
		}
	}
	removeTocLines(tocPath, (line) => isGraftOwnedRel(line.trim()));
	dedupeToc(tocPath);
}

/** Copy graft kit files into working expand (overwrites). Caller must wipe first. */
export function copyGraftKit(
	kitExpandDir: string,
	destExpandDir: string,
	manifestPaths: string[],
): void {
	for (const rel of manifestPaths) {
		const src = join(kitExpandDir, ...rel.split("/"));
		const dest = join(destExpandDir, ...rel.split("/"));
		if (!existsSync(src)) {
			throw new Error(`graft kit missing file: ${rel}`);
		}
		mkdirSync(dirname(dest), { recursive: true });
		cpSync(src, dest);
	}
}

/**
 * Copy non-bridge ops from a foreign expand's project1 into an MCP shell expand.
 * Returns toc-relative paths that were added (for mergeTocEntries).
 */
export function mergeForeignProject1(
	foreignExpandDir: string,
	shellExpandDir: string,
): string[] {
	const foreignP1 = join(foreignExpandDir, "project1");
	const shellP1 = join(shellExpandDir, "project1");
	if (!existsSync(foreignP1)) {
		throw new Error("foreign expand missing project1");
	}
	if (!existsSync(shellP1)) {
		throw new Error("shell expand missing project1");
	}
	const added: string[] = [];
	const walk = (relParent: string): void => {
		const srcDir = relParent
			? join(foreignP1, ...relParent.split("/"))
			: foreignP1;
		for (const name of readdirSync(srcDir)) {
			if (name === "." || name === "..") continue;
			if (!relParent && isGraftOwnedProject1Entry(name)) continue;
			const rel = relParent ? `${relParent}/${name}` : name;
			const src = join(foreignP1, ...rel.split("/"));
			const dest = join(shellP1, ...rel.split("/"));
			const st = statSync(src);
			if (st.isDirectory()) {
				mkdirSync(dest, { recursive: true });
				walk(rel);
				continue;
			}
			mkdirSync(dirname(dest), { recursive: true });
			cpSync(src, dest);
			added.push(`project1/${rel}`);
		}
	};
	walk("");
	added.sort();
	return added;
}

/**
 * After graft: ensure no duplicate op names, toc clean, and (when projectDir
 * given) no sidecar `.tox` colliding with an op name.
 * Throws with NODE_NAME_DUPLICATE / TOC_DUPLICATE / TOX_NAME_COLLISION prefixes.
 */
export function assertGraftClean(
	expandDir: string,
	tocPath: string,
	projectDir?: string,
): void {
	assertToeBuildClean({ expandDir, projectDir, tocPath });
	// Reserved stems must appear exactly once as an op name
	for (const stem of [BRIDGE_NAME, ONSTART_NAME, LEGACY_BRIDGE_NAME]) {
		if (stem === LEGACY_BRIDGE_NAME) {
			const legacyHits = findProject1EntriesByStem(expandDir, stem);
			if (legacyHits.length > 0) {
				throw new Error(
					`NODE_NAME_DUPLICATE: legacy stem ${stem} still present after graft (${legacyHits.join(", ")}); expected ${BRIDGE_NAME}`,
				);
			}
			continue;
		}
		const hits = findProject1EntriesByStem(expandDir, stem);
		const spellings = new Set(
			hits.map((h) => nodeNameFromEntry(h.split("/").pop()!)),
		);
		if (spellings.size > 1) {
			throw new Error(
				`NODE_NAME_DUPLICATE: reserved stem ${stem} has case variants ${[...spellings].join(", ")}`,
			);
		}
	}
}

/**
 * Clear externaltox / keep enableexternaltox off.
 *
 * Pointing externaltox at any on-disk `.tox` whose root op is
 * `mcp_webserver_base` (even if the file is named `tdmcp_bridge.tox`) makes TD
 * show "unexpected node name duplication" and often create
 * `mcp_webserver_base1` on open. Modules resolve via project.folder instead.
 */
export function patchExternalToxParm(expandDir: string): void {
	const parmPath = join(expandDir, "project1", `${BRIDGE_NAME}.parm`);
	if (!existsSync(parmPath)) {
		throw new Error(`missing ${parmPath} after graft`);
	}
	let body = readFileSync(parmPath, "utf8");
	const enableLine = "enableexternaltox 0 off";
	const externalLine = 'externaltox 17 "" ""';
	if (/^enableexternaltox\b/m.test(body)) {
		body = body.replace(/^enableexternaltox\b.*$/m, enableLine);
	} else if (body.trimEnd().endsWith("?")) {
		body = `${body.trimEnd().slice(0, -1)}${enableLine}\n?\n`;
	} else {
		body = `${body.trimEnd()}\n${enableLine}\n`;
	}
	if (/^externaltox\b/m.test(body)) {
		body = body.replace(/^externaltox\b.*$/m, externalLine);
	} else {
		body = body.replace(/^(enableexternaltox\b.*)$/m, `$1\n${externalLine}`);
	}
	writeFileSync(parmPath, body);
}

/**
 * Rewrite embedded import_modules Text DAT from templates/import_modules.py so
 * setup() resolves modules from project.folder when externaltox is empty.
 */
export function patchImportModulesText(expandDir: string): void {
	const textPath = join(expandDir, ...IMPORT_MODULES_TEXT_REL.split("/"));
	if (!existsSync(textPath)) {
		throw new Error(`missing ${textPath} after graft`);
	}
	const srcPy = join(templateRoot(), "import_modules.py");
	if (!existsSync(srcPy)) {
		throw new Error(`MCP template missing import_modules.py at ${srcPy}`);
	}
	writeTdTextDat(textPath, readFileSync(srcPy, "utf8"));
}

/**
 * Rewrite tdmcp_port_onstart Execute DAT from templates/tdmcp_port_onstart.py
 * (loadTox bridge from modules/ when not embedded, then apply port).
 */
export function patchOnstartText(expandDir: string): void {
	const textPath = join(expandDir, ...ONSTART_TEXT_REL.split("/"));
	if (!existsSync(textPath)) {
		throw new Error(`missing ${textPath} after graft`);
	}
	const srcPy = join(templateRoot(), "tdmcp_port_onstart.py");
	if (!existsSync(srcPy)) {
		throw new Error(
			`MCP template missing tdmcp_port_onstart.py at ${srcPy}`,
		);
	}
	writeTdTextDat(textPath, readFileSync(srcPy, "utf8"));
}

/**
 * Bake owned port + Active into COMP custom pars so Parameter DAT → WebServer
 * expressions are valid on first cook (avoids "float argument must not be none").
 */
export function patchBridgePortParm(expandDir: string, port: number): void {
	const parmPath = join(expandDir, "project1", `${BRIDGE_NAME}.parm`);
	if (!existsSync(parmPath)) {
		throw new Error(`missing ${parmPath} after graft`);
	}
	let body = readFileSync(parmPath, "utf8");
	// Existing template line looks like: Port 67108928 9981
	if (/^Port\b/m.test(body)) {
		body = body.replace(/^Port\b.*$/m, `Port 67108928 ${port}`);
	} else {
		const line = `Port 67108928 ${port}`;
		if (body.trimEnd().endsWith("?")) {
			body = `${body.trimEnd().slice(0, -1)}${line}\n?\n`;
		} else {
			body = `${body.trimEnd()}\n${line}\n`;
		}
	}
	// Ensure Active is on (toggle custom par feeding WebServer active expr)
	if (/^Active\b/m.test(body)) {
		body = body.replace(/^Active\b.*$/m, "Active 1 on");
	} else if (/^Port\b/m.test(body)) {
		body = body.replace(/^(Port\b.*)$/m, "$1\nActive 1 on");
	} else {
		body = `${body.trimEnd()}\nActive 1 on\n`;
	}
	writeFileSync(parmPath, body);
}

export function detectNewline(text: string): "\r\n" | "\n" {
	return text.includes("\r\n") ? "\r\n" : "\n";
}

/** Append missing toc entries; preserve newline style; case-insensitive dedupe. */
export function mergeTocEntries(
	tocPath: string,
	entries: string[],
): { added: string[] } {
	const raw = readFileSync(tocPath);
	let text = raw.toString("utf8");
	const nl = detectNewline(text);
	const existing = new Set(
		text
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean)
			.map(normKey),
	);
	const added: string[] = [];
	let out = text;
	if (out.length > 0 && !out.endsWith("\n") && !out.endsWith("\r")) {
		out += nl;
	}
	for (const entry of entries) {
		const key = normKey(entry);
		if (existing.has(key)) continue;
		out += entry + nl;
		added.push(entry);
		existing.add(key);
	}
	writeFileSync(tocPath, out, "utf8");
	dedupeToc(tocPath);
	return { added };
}

export function removeTocLines(
	tocPath: string,
	shouldRemove: (line: string) => boolean,
): void {
	const text = readFileSync(tocPath, "utf8");
	const nl = detectNewline(text);
	const lines = text.split(/\r?\n/);
	const kept = lines.filter((l) => {
		const t = l.trim();
		if (!t) return true;
		return !shouldRemove(t);
	});
	let out = kept.join(nl);
	if (text.endsWith("\n") || text.endsWith("\r\n")) {
		if (!out.endsWith("\n")) out += nl;
	}
	writeFileSync(tocPath, out, "utf8");
}

export function readBuildVersion(expandDir: string): string | null {
	const buildPath = join(expandDir, ".build");
	if (!existsSync(buildPath)) return null;
	const text = readFileSync(buildPath, "utf8");
	const m = text.match(/^build\s+(\S+)/m);
	return m?.[1] ?? null;
}

/**
 * Copy the graft kit `.build` over the working expand `.build`.
 *
 * Why: `toecollapse` preserves expand `.build`. Inject grafts a modern bridge
 * into often much older community toes, then leaves `build 20XX.…` from the
 * source. Matching `.build` to the kit skips a hostile upgrade path on open.
 */
export function syncBuildFromKit(
	expandDir: string,
	kitExpandDir: string,
): { sourceBuild: string | null; graftBuild: string | null } {
	const sourceBuild = readBuildVersion(expandDir);
	const kitBuildPath = join(kitExpandDir, ".build");
	if (!existsSync(kitBuildPath)) {
		throw new Error(`graft kit missing .build at ${kitBuildPath}`);
	}
	cpSync(kitBuildPath, join(expandDir, ".build"));
	return { graftBuild: readBuildVersion(expandDir), sourceBuild };
}

/**
 * Raise `#expectednodes <count> <nextId>` so grafted kit ops do not collide
 * with the host toe's node-id allocator. TD reports collisions as
 * "Unexpected node duplication (/project1/<bridge>) in file."
 */
export function syncExpectedNodesFromKit(
	expandDir: string,
	kitExpandDir: string,
): { sourceNextId: number | null; nextId: number | null } {
	const startPath = join(expandDir, ".start");
	const kitStartPath = join(kitExpandDir, ".start");
	if (!existsSync(startPath) || !existsSync(kitStartPath)) {
		return { nextId: null, sourceNextId: null };
	}
	const src = readFileSync(startPath, "utf8");
	const kit = readFileSync(kitStartPath, "utf8");
	const srcM = src.match(/#expectednodes\s+(\d+)\s+(\d+)/);
	const kitM = kit.match(/#expectednodes\s+(\d+)\s+(\d+)/);
	if (!srcM || !kitM) {
		return { nextId: null, sourceNextId: null };
	}
	const sourceNextId = Number(srcM[2]);
	const count = Math.max(Number(srcM[1]), Number(kitM[1])) + 64;
	const nextId = Math.max(sourceNextId, Number(kitM[2])) + 10_000;
	const updated = src.replace(
		/#expectednodes\s+\d+\s+\d+/,
		`#expectednodes ${count} ${nextId}`,
	);
	writeFileSync(startPath, updated);
	return { nextId, sourceNextId };
}

export function assertManifestPresent(
	expandDir: string,
	manifestPaths: string[],
): string[] {
	return manifestPaths.filter((p) => !pathExistsInExpand(expandDir, p));
}

export { BRIDGE_STEM, ONSTART_STEM, isGraftOwnedRel };

/** Resolve path helpers for tests. */
export function resolveUnderExpand(expandDir: string, rel: string): string {
	return resolve(expandDir, ...rel.split("/"));
}

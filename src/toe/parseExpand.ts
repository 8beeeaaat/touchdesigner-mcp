import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** Operator input edge from `inputs { index name }` in a `.n` file. */
export type OpInputEdge = {
	kind: "op";
	/** Expand-relative path of the destination node (owner of the .n). */
	to: string;
	/** Source name as written (often sibling-relative). */
	fromName: string;
	index: number;
};

/** COMP boundary edge from `compinputs` in a `.network` file. */
export type CompInputEdge = {
	kind: "comp";
	/** Expand-relative path of the COMP that owns the .network. */
	to: string;
	/** Source path as written (may include /out connectors). */
	from: string;
	index: number;
	connector?: string;
	family?: string;
};

export type WireEdge = OpInputEdge | CompInputEdge;

export type ParmRow = {
	name: string;
	/** Remainder of the parm line after the name (raw). */
	raw: string;
	isExpr: boolean;
};

export type RefHit = {
	path: string;
	param?: string;
	snippet: string;
	kind: "op" | "path" | "expr" | "externaltox";
};

const EXPR_HINT = /\bop\s*\(|\/project\d*\b|parent\s*\(|\bme\.|externaltox/i;

/**
 * Parse `inputs { … }` blocks from a `.n` file body.
 * Grammar (observed): after type line, optional `inputs` / `{` / `index\tname` / `}`.
 */
export function parseNInputs(nBody: string): { index: number; name: string }[] {
	const lines = nBody.split(/\r?\n/);
	const out: { index: number; name: string }[] = [];
	let inInputs = false;
	for (const line of lines) {
		const t = line.trim();
		if (!inInputs) {
			if (t === "inputs") {
				inInputs = true;
			}
			continue;
		}
		if (t === "{") continue;
		if (t === "}") break;
		const m = t.match(/^(\d+)\s+(\S+)/);
		if (m) {
			out.push({ index: Number(m[1]), name: m[2] });
		}
	}
	return out;
}

/**
 * Parse `compinputs { … }` from a `.network` file.
 * Observed triples: index, source path, connector name, family (family may be on own line).
 */
export function parseCompInputs(
	networkBody: string,
): { index: number; from: string; connector?: string; family?: string }[] {
	const lines = networkBody.split(/\r?\n/).map((l) => l.trim());
	const out: {
		index: number;
		from: string;
		connector?: string;
		family?: string;
	}[] = [];
	let i = 0;
	while (i < lines.length && lines[i] !== "compinputs") i += 1;
	if (i >= lines.length) return out;
	i += 1;
	if (lines[i] === "{") i += 1;
	while (i < lines.length && lines[i] !== "}" && lines[i] !== "end") {
		const idxLine = lines[i];
		const m = idxLine.match(/^(\d+)\s+(\S+)/);
		if (!m) {
			i += 1;
			continue;
		}
		const index = Number(m[1]);
		const from = m[2];
		i += 1;
		let connector: string | undefined;
		let family: string | undefined;
		if (
			i < lines.length &&
			lines[i] &&
			!/^\d+\s/.test(lines[i]) &&
			lines[i] !== "}"
		) {
			connector = lines[i];
			i += 1;
		}
		if (
			i < lines.length &&
			lines[i] &&
			/^[A-Z]+$/.test(lines[i]) &&
			lines[i] !== "}"
		) {
			family = lines[i];
			i += 1;
		}
		out.push({ connector, family, from, index });
	}
	return out;
}

/**
 * Parse `.parm` into named rows. Skips lone `?` separators.
 * Expression heuristic: op(, /project, parent(), me., externaltox.
 */
export function parseParmRows(parmBody: string): ParmRow[] {
	const rows: ParmRow[] = [];
	for (const line of parmBody.split(/\r?\n/)) {
		const t = line.trim();
		if (!t || t === "?") continue;
		const sp = t.search(/\s/);
		if (sp < 0) {
			rows.push({ isExpr: EXPR_HINT.test(t), name: t, raw: "" });
			continue;
		}
		const name = t.slice(0, sp);
		const raw = t.slice(sp).trim();
		rows.push({
			isExpr: EXPR_HINT.test(raw) || name.toLowerCase() === "externaltox",
			name,
			raw,
		});
	}
	return rows;
}

export function readTextFile(path: string): string | null {
	if (!existsSync(path)) return null;
	try {
		return readFileSync(path, "utf8");
	} catch {
		return null;
	}
}

export function readOpHintFromN(nBody: string): string | undefined {
	const first = nBody.split(/\r?\n/, 1)[0]?.trim();
	if (first && /^[A-Z]+:[A-Za-z0-9_]+$/.test(first)) return first;
	return undefined;
}

/**
 * Classify a parm value / snippet as a ref kind.
 */
export function classifyRef(
	paramName: string,
	raw: string,
): RefHit["kind"] | null {
	const lower = paramName.toLowerCase();
	if (lower === "externaltox" || /\bexternaltox\b/i.test(raw)) {
		return "externaltox";
	}
	if (/\bop\s*\(/.test(raw)) return "op";
	if (
		/\/project\d*\//.test(raw) ||
		/\/[a-zA-Z_]\w*(?:\/[a-zA-Z_]\w*)+/.test(raw)
	) {
		return "path";
	}
	if (/\bparent\s*\(|\bme\./.test(raw)) return "expr";
	if (EXPR_HINT.test(raw)) return "expr";
	return null;
}

/** Resolve sibling-relative input name to expand-relative path. */
export function resolveSiblingPath(
	ownerPath: string,
	fromName: string,
): string {
	if (fromName.includes("/")) {
		// Absolute-ish expand path or cross-comp: if starts with project-like, keep; else join parent
		if (
			fromName.startsWith("project") ||
			fromName.startsWith("local") ||
			fromName.startsWith("/")
		) {
			return fromName.replace(/^\//, "");
		}
		const parent = dirname(ownerPath);
		if (parent === "." || parent === "") return fromName;
		// e.g. feedbackEdge/out1 relative to project1 → project1/feedbackEdge/out1
		return `${parent}/${fromName}`.replace(/\\/g, "/");
	}
	const parent = dirname(ownerPath);
	if (parent === "." || parent === "") return fromName;
	return `${parent}/${fromName}`.replace(/\\/g, "/");
}

export function nFileForPath(expandDir: string, relPath: string): string {
	return join(expandDir, `${relPath}.n`);
}

export function parmFileForPath(expandDir: string, relPath: string): string {
	return join(expandDir, `${relPath}.parm`);
}

export function networkFileForPath(expandDir: string, relPath: string): string {
	return join(expandDir, `${relPath}.network`);
}

export function textFileForPath(expandDir: string, relPath: string): string {
	return join(expandDir, `${relPath}.text`);
}

export function nodeLeaf(relPath: string): string {
	return basename(relPath);
}

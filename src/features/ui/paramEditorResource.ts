/**
 * Parameter Editor UI resource
 *
 * Loads the prebuilt guest UI (a single self-contained HTML file produced by
 * `src/ui-app`) and exposes it as the `ui://` resource for the parameter editor
 * MCP App. The HTML is read once and cached for the process lifetime.
 *
 * Build pipeline: `src/ui-app` (Vite + vite-plugin-singlefile) → dist/paramEditor.html
 * → copied next to the server bundle at build time (see build:ui-app script).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TdNode } from "../../gen/endpoints/TouchDesignerAPI.js";

/** Stable identifier the tool's `_meta` points at and the host fetches. */
export const PARAM_EDITOR_URI = "ui://touchdesigner/param-editor";

const HTML_FILENAME = "paramEditor.html";

let cachedHtml: string | null = null;

/**
 * Read the prebuilt param-editor HTML, resolving it relative to this module so
 * it works both from `src` (tsx) and the compiled `dist` output.
 */
export function loadParamEditorHtml(): string {
	if (cachedHtml !== null) return cachedHtml;
	const here = dirname(fileURLToPath(import.meta.url));
	cachedHtml = readFileSync(join(here, HTML_FILENAME), "utf-8");
	return cachedHtml;
}

/** A single editable parameter the guest UI renders as a form field. */
export interface EditorParam {
	name: string;
	/** "string" | "number" | "boolean" — drives the input type in the UI. */
	kind: "string" | "number" | "boolean";
	value: string | number | boolean;
}

/** Structured data the tool returns; the host forwards it to the guest UI. */
export interface ParamEditorData {
	nodePath: string;
	params: EditorParam[];
}

/** Classify a raw property value into an editor field kind. */
function kindOf(value: unknown): EditorParam["kind"] {
	if (typeof value === "boolean") return "boolean";
	if (typeof value === "number") return "number";
	return "string";
}

/**
 * Project a full node record down to the editor payload. Only scalar
 * properties (string/number/boolean) become editable fields — nested objects
 * and arrays are skipped because there is no single-field editor for them.
 */
export function toParamEditorData(node: TdNode): ParamEditorData {
	const params: EditorParam[] = [];
	for (const [name, value] of Object.entries(node.properties ?? {})) {
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			params.push({ kind: kindOf(value), name, value });
		}
	}
	return { nodePath: node.path, params };
}

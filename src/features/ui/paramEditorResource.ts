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
import type { TdNodeParSpecs } from "../../gen/endpoints/TouchDesignerAPI.js";

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

/**
 * Structured data the tool returns; the host forwards it to the guest UI.
 * This is the full Par specification report from `get_node_par_specs` — the
 * editor renders an input per parameter based on its `style`/range/menu.
 */
export type ParamEditorData = TdNodeParSpecs;

/**
 * Pass the Par specs through to the guest UI. The server-side projection lives
 * in Python (`_par_spec`); this layer only narrows the type for the tool result.
 */
export function toParamEditorData(specs: TdNodeParSpecs): ParamEditorData {
	return {
		nodeName: specs.nodeName,
		nodePath: specs.nodePath,
		opType: specs.opType,
		pars: specs.pars,
	};
}

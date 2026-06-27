/**
 * Node Browser UI resource
 *
 * Loads the prebuilt guest UI (a single self-contained HTML file produced by
 * `src/ui-app`) and exposes it as the `ui://` resource for the node browser MCP
 * App. The HTML is read once and cached for the process lifetime.
 *
 * Build pipeline: `src/ui-app` (Vite + vite-plugin-singlefile) → dist/index.html
 * → copied next to the server bundle at build time (see build:ui-app script).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TdNode } from "../../gen/endpoints/TouchDesignerAPI.js";

/** Stable identifier the tool's `_meta` points at and the host fetches. */
export const NODE_BROWSER_URI = "ui://touchdesigner/node-browser";

const HTML_FILENAME = "nodeBrowser.html";

let cachedHtml: string | null = null;

/**
 * Read the prebuilt node-browser HTML, resolving it relative to this module so
 * it works both from `src` (tsx) and the compiled `dist` output.
 */
export function loadNodeBrowserHtml(): string {
	if (cachedHtml !== null) return cachedHtml;
	const here = dirname(fileURLToPath(import.meta.url));
	cachedHtml = readFileSync(join(here, HTML_FILENAME), "utf-8");
	return cachedHtml;
}

/** Fields the guest UI renders — keeps the structuredContent payload small. */
export interface BrowserNode {
	name: string;
	path: string;
	opType: string;
}

/** Structured data the tool returns; the host forwards it to the guest UI. */
export interface NodeBrowserData {
	parentPath: string;
	nodes: BrowserNode[];
}

/** Project the full node records down to the browser payload. */
export function toNodeBrowserData(
	nodes: TdNode[],
	parentPath: string,
): NodeBrowserData {
	return {
		nodes: nodes.map((n) => ({
			name: n.name,
			opType: n.opType,
			path: n.path,
		})),
		parentPath,
	};
}

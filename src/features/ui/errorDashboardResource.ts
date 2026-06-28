/**
 * Error Dashboard UI resource
 *
 * Loads the prebuilt guest UI (a single self-contained HTML file produced by
 * `src/ui-app`) and exposes it as the `ui://` resource for the error dashboard
 * MCP App. The HTML is read once and cached for the process lifetime.
 *
 * Build pipeline: `src/ui-app` (Vite + vite-plugin-singlefile) → dist/errorDashboard.html
 * → copied next to the server bundle at build time (see build:ui-app script).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TdNodeErrorReport } from "../../gen/endpoints/TouchDesignerAPI.js";

/** Stable identifier the tool's `_meta` points at and the host fetches. */
export const ERROR_DASHBOARD_URI = "ui://touchdesigner/error-dashboard";

const HTML_FILENAME = "errorDashboard.html";

let cachedHtml: string | null = null;

/**
 * Read the prebuilt error-dashboard HTML, resolving it relative to this module
 * so it works both from `src` (tsx) and the compiled `dist` output.
 */
export function loadErrorDashboardHtml(): string {
	if (cachedHtml !== null) return cachedHtml;
	const here = dirname(fileURLToPath(import.meta.url));
	cachedHtml = readFileSync(join(here, HTML_FILENAME), "utf-8");
	return cachedHtml;
}

/**
 * Structured data the tool returns; the host forwards it to the guest UI.
 * Mirrors the server's aggregated error report from `get_node_errors`.
 */
export type ErrorDashboardData = TdNodeErrorReport;

/**
 * Narrow the error report to the dashboard payload. The report is already the
 * shape the UI renders, so this only fixes the field order for a stable result.
 */
export function toErrorDashboardData(
	report: TdNodeErrorReport,
): ErrorDashboardData {
	return {
		errorCount: report.errorCount,
		errors: report.errors,
		hasErrors: report.hasErrors,
		nodeName: report.nodeName,
		nodePath: report.nodePath,
		opType: report.opType,
	};
}

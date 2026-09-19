import type { TdNodeErrorReport } from "../../../gen/endpoints/TouchDesignerAPI.js";
import {
	DEFAULT_PRESENTER_FORMAT,
	type PresenterFormat,
	presentStructuredData,
} from "./presenter.js";
import type { FormatterOptions } from "./responseFormatter.js";
import {
	finalizeFormattedText,
	limitArray,
	mergeFormatterOptions,
} from "./responseFormatter.js";

export type NodeErrorReportData = TdNodeErrorReport;

export function formatNodeErrors(
	data: NodeErrorReportData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data) {
		return "No node error information is available.";
	}

	if (opts.detailLevel === "detailed") {
		return formatDetailed(data, opts.responseFormat);
	}

	const entries = data.errors ?? [];

	if (entries.length === 0) {
		const noErrorText = `Node ${data.nodePath} has no reported errors or warnings.`;
		return finalizeFormattedText(noErrorText, opts, {
			context: {
				entries: [],
				errorCount: 0,
				nodeName: data.nodeName,
				nodePath: data.nodePath,
				opType: data.opType,
				warningCount: 0,
			},
			structured: data,
			template: "nodeErrorSummary",
		});
	}

	// Errors first: a warning never blocks a fix that an error already blocks.
	const ordered = [...entries].sort(
		(a, b) => levelRank(a.level) - levelRank(b.level),
	);
	const { items, truncated } = limitArray(ordered, opts.limit);

	const warningCount = data.warningCount ?? 0;
	const header =
		`Node: ${data.nodePath}\n` +
		`Operator: ${data.opType} (${data.nodeName})\n` +
		`${data.errorCount} error(s), ${warningCount} warning(s) found\n`;

	const body =
		opts.detailLevel === "minimal"
			? formatMinimal(items)
			: formatSummary(items);

	let text = `${header}\n${body}`;

	if (truncated) {
		text += `\n💡 ${entries.length - items.length} more entries omitted.`;
	}

	return finalizeFormattedText(text, opts, {
		context: {
			displayed: items.length,
			entries: items.map((entry) => ({
				level: entry.level ?? "error",
				message: collapseMessage(entry.message),
				nodePath: entry.nodePath,
				opType: entry.opType,
			})),
			errorCount: data.errorCount,
			nodeName: data.nodeName,
			nodePath: data.nodePath,
			omittedCount: Math.max(entries.length - items.length, 0),
			opType: data.opType,
			truncated,
			warningCount,
		},
		structured: data,
		template: "nodeErrorSummary",
	});
}

/**
 * Sort key placing errors ahead of warnings
 */
function levelRank(level: string | undefined): number {
	return level === "warning" ? 1 : 0;
}

/**
 * Render a multi-line TouchDesigner message on a single line.
 *
 * Messages carrying a Python traceback span several lines, which would break
 * out of a markdown table cell.
 */
function collapseMessage(message: string): string {
	return message
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.join(" ⏎ ");
}

function formatMinimal(entries: NodeErrorReportData["errors"]) {
	return entries
		.map(
			(entry) =>
				`- [${entry.level ?? "error"}] ${entry.nodePath}: ${collapseMessage(entry.message)}`,
		)
		.join("\n");
}

function formatSummary(entries: NodeErrorReportData["errors"]) {
	return entries
		.map(
			(entry) =>
				`- [${entry.level ?? "error"}] ${entry.nodePath} (${entry.opType}): ${collapseMessage(entry.message)}`,
		)
		.join("\n");
}

function formatDetailed(
	data: NodeErrorReportData,
	format: PresenterFormat | undefined,
): string {
	const title = `Node error report for ${data.nodePath}`;
	const payloadFormat = format ?? DEFAULT_PRESENTER_FORMAT;
	return presentStructuredData(
		{
			context: {
				payloadFormat,
				title,
			},
			detailLevel: "detailed",
			structured: data,
			template: "detailedPayload",
			text: title,
		},
		payloadFormat,
	);
}

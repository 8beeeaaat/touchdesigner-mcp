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
	const warningCount = data.warningCount ?? 0;
	const skipped = data.skippedStreams ?? [];
	const unresolved = data.unresolvedAnchors ?? [];
	const lookupFailures = data.lookupFailures ?? [];
	const fallbacks = data.fallbackAttributions ?? [];

	// Errors first: a warning never blocks a fix that an error already blocks.
	const ordered = [...entries].sort(
		(a, b) => levelRank(a.level) - levelRank(b.level),
	);
	const { items, truncated } = limitArray(ordered, opts.limit);

	// The counts come from the server; the rows are what we were given. When
	// they disagree, say so rather than quietly presenting one as the other.
	const listedErrors = entries.filter((e) => e.level !== "warning").length;
	const countsDisagree =
		listedErrors !== data.errorCount ||
		entries.length - listedErrors !== warningCount;

	const text =
		entries.length === 0
			? `Node ${data.nodePath} has no reported errors or warnings.`
			: `Node ${data.nodePath}: ${data.errorCount} error(s), ${warningCount} warning(s).`;

	return finalizeFormattedText(text, opts, {
		context: {
			countsDisagree,
			displayed: items.length,
			entries: items.map((entry) => ({
				level: entry.level ?? "error",
				message: collapseMessage(entry.message),
				nodePath: entry.nodePath,
				// Minimal drops the operator type; the path already identifies
				// the node and the type is the least load-bearing column.
				opType: opts.detailLevel === "minimal" ? "" : entry.opType,
			})),
			errorCount: data.errorCount,
			fallbackAttributions: limitPaths(fallbacks, opts.limit),
			// Only an unread stream leaves the counts without a ceiling. A
			// declined anchor keeps its content, so it is reported on its own
			// rather than folded into this claim.
			incomplete: Boolean(data.incomplete) || skipped.length > 0,
			listedCount: entries.length,
			lookupFailures: limitPaths(lookupFailures, opts.limit),
			nodeName: data.nodeName,
			nodePath: data.nodePath,
			omittedCount: Math.max(entries.length - items.length, 0),
			opType: data.opType,
			skippedStreams: skipped.map((s) => ({
				reason: s.reason,
				stream: s.stream,
			})),
			skippedStreamsOmitted: 0,
			truncated,
			unresolvedAnchors: limitPaths(unresolved, opts.limit),
			warningCount,
		},
		structured: data,
		template: "nodeErrorSummary",
	});
}

/**
 * Cap a caveat list the way the entries are capped.
 *
 * `limit` is the only control a caller has over response size, and it used to
 * bind the rows while leaving the notes about them unbounded — a root-scope
 * query on a project mid-edit could answer a request for five rows with a
 * hundred-line footnote, which is the content being displaced by the caveat
 * about it. The whole list stays available through detailLevel "detailed".
 */
function limitPaths(
	list: ReadonlyArray<{ path: string; stream: string }>,
	limit: number | undefined,
) {
	const { items } = limitArray([...list], limit);
	return {
		items: items.map((item) => ({ path: item.path, stream: item.stream })),
		length: items.length,
		omitted: Math.max(list.length - items.length, 0),
	};
}

/**
 * Sort key placing errors ahead of warnings
 */
function levelRank(level: string | undefined): number {
	return level === "warning" ? 1 : 0;
}

/**
 * Render a TouchDesigner message so it survives a markdown table cell.
 *
 * Two characters break the row: a newline, which a Python traceback always
 * carries, and a pipe, which turns up in shader diagnostics and in Python
 * expressions the message quotes back.
 */
function collapseMessage(message: string): string {
	return message
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.join(" ⏎ ")
		.replaceAll("|", "\\|");
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

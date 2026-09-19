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

	// The payload keeps the two apart so an older client cannot render
	// warnings under an "N error(s) found" heading. Merging them for display
	// is this layer's job, and the sort below puts errors first.
	//
	// Which array an entry arrived in is the authority on its level, so the
	// tag is taken from there rather than from the field. An entry's own
	// `level` is optional, and reading it would make a warning with the field
	// missing render as an error — the distinction these two arrays exist to
	// carry, lost on the way out.
	const entries = [
		...(data.errors ?? []).map((entry) => ({ ...entry, level: "error" })),
		...(data.warnings ?? []).map((entry) => ({ ...entry, level: "warning" })),
	];
	// A component predating warning collection sends neither field. Rendering
	// that as zero would claim the warning stream was inspected and found
	// empty, which is the confident-but-wrong report this tool exists to stop
	// producing — and the reader has no way to tell it from a genuinely clean
	// node.
	const warningsKnown =
		data.warningCount !== undefined || data.hasWarnings !== undefined;
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

	// Only an unread stream leaves the counts without a ceiling. A declined
	// anchor keeps its content, so it is reported on its own rather than
	// folded into this claim.
	const reportIncomplete = Boolean(data.incomplete) || skipped.length > 0;

	// The counts come from the server; the rows are what we were given. When
	// they disagree, say so rather than quietly presenting one as the other.
	const listedErrors = entries.filter((e) => e.level === "error").length;
	const countsDisagree =
		listedErrors !== data.errorCount ||
		(warningsKnown && entries.length - listedErrors !== warningCount);

	// Whether the entries are everything there was to find. Each notice this
	// formatter can print is a way that claim fails, so anything asserting
	// completeness has to be gated on all of them together rather than on
	// whichever one was in mind at the time.
	const listIsTheWholeTruth =
		!reportIncomplete && warningsKnown && !countsDisagree;

	const text =
		entries.length === 0
			? `Node ${data.nodePath}: nothing listed.`
			: `Node ${data.nodePath}: ${data.errorCount} error(s), ${
					warningsKnown ? warningCount : "an unreported number of"
				} warning(s).`;

	return finalizeFormattedText(text, opts, {
		context: {
			// An all-clear is a claim that the list is the whole truth, so it
			// needs every way the list could fall short to be ruled out: a
			// stream that went unread, a warning stream never inspected, and
			// counts that do not match what was listed. An empty list on its
			// own means "nothing was reported to me" just as readily as
			// "nothing to report", and only the second earns the sentence.
			cleanlyEmpty: listIsTheWholeTruth && entries.length === 0,
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
			incomplete: reportIncomplete,
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
			truncated,
			unresolvedAnchors: limitPaths(unresolved, opts.limit),
			warningCount: warningsKnown ? warningCount : "not reported",
			warningsUnknown: !warningsKnown,
		},
		structured: data,
		template: "nodeErrorSummary",
	});
}

/**
 * Cap a caveat list the way the entries are capped.
 *
 * `limit` is the only control a caller has over response size, so it binds
 * the notes about the rows as well as the rows themselves — a root-scope
 * query on a project mid-edit can have a hundred distinct unresolvable
 * owners, and a footnote longer than the content displaces the thing the
 * caller asked for. The whole list stays available through detailLevel
 * "detailed".
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

import type { TdNodeErrorReport } from "../../../gen/endpoints/TouchDesignerAPI.js";
import {
	DEFAULT_PRESENTER_FORMAT,
	type PresenterFormat,
	presentStructuredData,
} from "./presenter.js";
import type { FormatterOptions } from "./responseFormatter.js";
import {
	describeTruncation,
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
	const reportedErrors = data.errors ?? [];
	const reportedWarnings = data.warnings ?? [];
	const entries = [
		...reportedErrors.map((entry) => ({ ...entry, level: "error" })),
		...reportedWarnings.map((entry) => ({ ...entry, level: "warning" })),
	];
	// A component predating warning collection sends neither field. Rendering
	// that as zero would claim the warning stream was inspected and found
	// empty, which is the confident-but-wrong report this tool exists to stop
	// producing — and the reader has no way to tell it from a genuinely clean
	// node.
	// The count is the field that gets rendered, so it is the one that has to
	// be present. `hasWarnings` alone would flip this true and then `?? 0`
	// would invent the number every check below is computed from — a payload
	// saying it has warnings, rendered as "Warnings: 0" with an all-clear.
	const warningsKnown = data.warningCount !== undefined;
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

	// The caveat lists are capped for the structured payload with the same
	// call the markdown notices use, so the two can never cap differently.
	const shownAnchors = limitArray(unresolved, opts.limit).items;
	const shownLookupFailures = limitArray(lookupFailures, opts.limit).items;
	const shownFallbacks = limitArray(fallbacks, opts.limit).items;

	// Only an unread stream leaves the counts without a ceiling. A declined
	// anchor keeps its content, so it is reported on its own rather than
	// folded into this claim.
	const reportIncomplete = Boolean(data.incomplete) || skipped.length > 0;

	// The counts come from the server; the rows are what we were given. When
	// they disagree, say so rather than quietly presenting one as the other.
	const listedErrors = entries.filter((e) => e.level === "error").length;
	const listedWarnings = entries.length - listedErrors;
	const countsDisagree =
		listedErrors !== data.errorCount ||
		data.hasErrors !== listedErrors > 0 ||
		(warningsKnown &&
			(listedWarnings !== warningCount ||
				(data.hasWarnings !== undefined &&
					data.hasWarnings !== listedWarnings > 0)));

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

	// The merge above is errors-first and the sort is stable, so the rows that
	// survived the cap are the first N of `errors` followed by whatever budget
	// was left for `warnings`. Counting the survivors by level rather than
	// re-deriving the split from `limit` is what keeps the payload and the
	// rendered table showing the same entries.
	const shownErrors = items.filter((entry) => entry.level === "error").length;
	const truncation = describeTruncation(opts.limit, {
		errors: { returned: shownErrors, total: reportedErrors.length },
		fallbackAttributions: {
			returned: shownFallbacks.length,
			total: fallbacks.length,
		},
		lookupFailures: {
			returned: shownLookupFailures.length,
			total: lookupFailures.length,
		},
		unresolvedAnchors: {
			returned: shownAnchors.length,
			total: unresolved.length,
		},
		warnings: {
			returned: items.length - shownErrors,
			total: reportedWarnings.length,
		},
	});

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
			// Two different payloads land here and they deserve different
			// sentences: one predates warning collection entirely, the other
			// answered whether there are warnings but not how many. The
			// condition is presence, so it admits `hasWarnings: false` as
			// readily as `true` — the sentence it selects has to hold in both
			// directions, which is why it says "whether" rather than "has".
			warningCountMissing: !warningsKnown && data.hasWarnings !== undefined,
			warningsUnknown: !warningsKnown && data.hasWarnings === undefined,
		},
		structured: capReport(data, {
			errors: reportedErrors.slice(0, shownErrors),
			fallbackAttributions: shownFallbacks,
			lookupFailures: shownLookupFailures,
			unresolvedAnchors: shownAnchors,
			warnings: reportedWarnings.slice(0, items.length - shownErrors),
		}),
		template: "nodeErrorSummary",
		truncation,
	});
}

/**
 * Apply the caps to the report the caller receives, keeping its shape.
 *
 * The report goes back in the shape the API defines — `errors` and `warnings`
 * as separate collections, the counts left at the server's totals — because
 * that is the shape the tool's own usage example reads, and because the counts
 * are the only thing left saying how much the cap removed. Rewriting them to
 * match the shortened arrays would make the payload self-consistent and wrong.
 *
 * A collection the report never sent stays absent: `unresolvedAnchors` missing
 * means the component said nothing about ambiguous attributions, and
 * `warnings` missing means the component predates warning collection
 * entirely — an empty array would turn either into "none found".
 *
 * This runs whether or not anything was cut. An uncapped call rebuilds the
 * report from the same values in the same order, so the caller sees what the
 * server sent either way, and there is no "nothing was removed" shortcut here
 * to go stale against the caps above.
 */
function capReport(
	data: NodeErrorReportData,
	caps: {
		errors: NodeErrorReportData["errors"];
		warnings: NonNullable<NodeErrorReportData["warnings"]>;
		unresolvedAnchors: NonNullable<NodeErrorReportData["unresolvedAnchors"]>;
		lookupFailures: NonNullable<NodeErrorReportData["lookupFailures"]>;
		fallbackAttributions: NonNullable<
			NodeErrorReportData["fallbackAttributions"]
		>;
	},
): NodeErrorReportData {
	const report: NodeErrorReportData = { ...data, errors: caps.errors };
	if (data.warnings !== undefined) report.warnings = caps.warnings;
	if (data.unresolvedAnchors !== undefined)
		report.unresolvedAnchors = caps.unresolvedAnchors;
	if (data.lookupFailures !== undefined)
		report.lookupFailures = caps.lookupFailures;
	if (data.fallbackAttributions !== undefined)
		report.fallbackAttributions = caps.fallbackAttributions;
	return report;
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

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

	const errors = data.errors ?? [];

	if (errors.length === 0 || !data.hasErrors || data.errorCount === 0) {
		const noErrorText = `Node ${data.nodePath} has no reported errors.`;
		return finalizeFormattedText(noErrorText, opts, {
			context: {
				errorCount: 0,
				nodeName: data.nodeName,
				nodePath: data.nodePath,
			},
			structured: data,
			template: "nodeErrorSummary",
		});
	}

	const { items, truncated } = limitArray(errors, opts.limit);
	const header = `Node: ${data.nodePath}\nOperator: ${data.opType} (${data.nodeName})\n${data.errorCount} error(s) found (children included)\n`;

	const body =
		opts.detailLevel === "minimal"
			? formatMinimal(items)
			: formatSummary(items);

	let text = `${header}\n${body}`;

	if (truncated) {
		text += `\n💡 ${data.errorCount - items.length} more errors omitted.`;
	}

	return finalizeFormattedText(text, opts, {
		context: {
			displayed: items.length,
			errorCount: data.errorCount,
			nodeName: data.nodeName,
			nodePath: data.nodePath,
			opType: data.opType,
		},
		structured: data,
		template: "nodeErrorSummary",
	});
}

function formatMinimal(errors: NodeErrorReportData["errors"]) {
	return errors
		.map((entry) => `- ${entry.nodePath}: ${entry.message}`)
		.join("\n");
}

function formatSummary(errors: NodeErrorReportData["errors"]) {
	return errors
		.map((entry) => `- ${entry.nodePath} (${entry.opType}): ${entry.message}`)
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

/**
 * Node Details Formatter
 *
 * Formats TouchDesigner node parameter details with token optimization.
 * Used by GET_TD_NODE_PARAMETERS tool.
 */

import type { TdNode } from "../../../gen/endpoints/TouchDesignerAPI.js";
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

/**
 * Node details data structure (matches API response)
 */
export type NodeDetailsData = TdNode;

interface NodeDetailsContext {
	nodePath: string;
	type: string;
	id: number;
	name: string;
	total: number;
	displayed: number;
	properties: Array<{ name: string; value: string }>;
	truncated: boolean;
	omittedCount: number;
}

interface TextWithContext {
	text: string;
	context: NodeDetailsContext;
}

/**
 * Format node parameter details
 */
export function formatNodeDetails(
	data: NodeDetailsData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data) {
		return "No node details available.";
	}

	const nodePath = data.path;
	const properties = data.properties;
	const propertyKeys = properties ? Object.keys(properties) : [];

	if (propertyKeys.length === 0) {
		return `Node: ${nodePath}\nNo properties found.`;
	}

	if (opts.detailLevel === "detailed") {
		return formatDetailed(data, opts.responseFormat);
	}

	let result: TextWithContext;
	if (opts.detailLevel === "minimal") {
		result = formatMinimal(nodePath, propertyKeys, opts.limit);
	} else {
		result = formatSummary(nodePath, data, opts.limit);
	}

	const context = result.context as unknown as Record<string, unknown>;
	return finalizeFormattedText(result.text, opts, {
		template: "nodeDetailsSummary",
		context,
		structured: context,
	});
}

/**
 * Minimal mode: Property names only
 */
function formatMinimal(
	nodePath: string,
	propertyKeys: string[],
	limit?: number,
): TextWithContext {
	const { items, truncated } = limitArray(propertyKeys, limit);

	let text = `Node: ${nodePath}\nProperties (${propertyKeys.length}):\n${items.join(", ")}`;
	if (truncated) {
		text += `\n💡 ${propertyKeys.length - items.length} more properties omitted.`;
	}

	return {
		text,
		context: {
			nodePath,
			type: "",
			id: 0,
			name: "",
			total: propertyKeys.length,
			displayed: items.length,
			properties: items.map((name) => ({ name, value: "" })),
			truncated,
			omittedCount: Math.max(propertyKeys.length - items.length, 0),
		},
	};
}

/**
 * Summary mode: Key properties with values
 */
function formatSummary(
	nodePath: string,
	data: NodeDetailsData,
	limit?: number,
): TextWithContext {
	const properties = data.properties || {};
	const propertyEntries = Object.entries(properties);
	const { items, truncated } = limitArray(propertyEntries, limit);

	let text = `Node: ${nodePath}\n`;
	text += `Type: ${data.opType} (ID: ${data.id})\n`;
	text += `Name: ${data.name}\n`;
	text += `\nProperties (${propertyEntries.length}):\n\n`;

	const propsForContext: Array<{ name: string; value: string }> = [];
	for (const [key, value] of items) {
		const formattedValue = formatPropertyValue(value);
		text += `  ${key}: ${formattedValue}\n`;
		propsForContext.push({ name: key, value: formattedValue });
	}

	if (truncated) {
		text += `\n💡 ${propertyEntries.length - items.length} more properties omitted.`;
	}

	return {
		text,
		context: {
			nodePath,
			type: data.opType,
			id: data.id,
			name: data.name,
			total: propertyEntries.length,
			displayed: items.length,
			properties: propsForContext,
			truncated,
			omittedCount: Math.max(propertyEntries.length - items.length, 0),
		},
	};
}

/**
 * Detailed mode: Full JSON
 */
function formatDetailed(
	data: NodeDetailsData,
	format: PresenterFormat | undefined,
): string {
	const title = `Node ${data.path ?? data.name ?? "details"}`;
	const payloadFormat = format ?? DEFAULT_PRESENTER_FORMAT;
	return presentStructuredData(
		{
			text: title,
			detailLevel: "detailed",
			structured: data,
			context: {
				title,
				payloadFormat,
			},
			template: "detailedPayload",
		},
		payloadFormat,
	);
}

/**
 * Format property value for display
 */
function formatPropertyValue(value: unknown): string {
	if (value === undefined || value === null) {
		return "(none)";
	}

	if (typeof value === "string") {
		return value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		if (value.length <= 3) return `[${value.join(", ")}]`;
		return `[${value.slice(0, 3).join(", ")}, ... +${value.length - 3}]`;
	}

	if (typeof value === "object") {
		return `{${Object.keys(value).length} keys}`;
	}

	return String(value);
}

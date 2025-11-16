/**
 * Node List Formatter
 *
 * Formats TouchDesigner node lists with token-optimized output.
 * Used by GET_TD_NODES tool.
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
	formatOmissionHint,
	limitArray,
	mergeFormatterOptions,
} from "./responseFormatter.js";

/**
 * Node list data structure (matches API response)
 */
export interface NodeListData {
	nodes?: TdNode[];
	parentPath?: string;
	pattern?: string;
	includeProperties?: boolean;
	[key: string]: unknown;
}

interface NodeListContext {
	parentPath: string;
	totalCount: number;
	groups: Array<{
		type: string;
		count: number;
		nodes: Array<{ name: string; path?: string }>;
	}>;
	truncated: boolean;
	omittedCount: number;
}

interface TextWithContext {
	text: string;
	context: NodeListContext;
}

/**
 * Format node list based on detail level
 */
export function formatNodeList(
	data: NodeListData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data?.nodes || data.nodes.length === 0) {
		return "No nodes found.";
	}

	const nodes = data.nodes;
	const totalCount = nodes.length;
	const parentPath = data.parentPath ?? "project";

	// Apply limit
	const { items: limitedNodes, truncated } = limitArray(nodes, opts.limit);

	if (opts.detailLevel === "detailed") {
		return formatDetailed(nodes, data, opts.responseFormat, parentPath);
	}

	let result: TextWithContext;
	if (opts.detailLevel === "minimal") {
		result = formatMinimal(limitedNodes, parentPath, totalCount, truncated);
	} else {
		result = formatSummary(limitedNodes, parentPath, totalCount, truncated);
	}

	const hintEnabled = truncated && opts.includeHints;
	let output = result.text;
	if (hintEnabled) {
		output += formatOmissionHint(totalCount, limitedNodes.length, "node");
	}

	const context = result.context as unknown as Record<string, unknown>;
	context.truncated = hintEnabled;
	if (!hintEnabled) {
		context.omittedCount = 0;
	}
	return finalizeFormattedText(output, opts, {
		template: "nodeListSummary",
		context,
		structured: context,
	});
}

/**
 * Minimal mode: Only node paths
 */
function formatMinimal(
	nodes: TdNode[],
	parentPath: string,
	totalCount: number,
	truncated: boolean,
): TextWithContext {
	const paths = nodes.map((n) => n.path || n.name);
	const text = `Found ${nodes.length} nodes in ${parentPath}:
${paths.join("\n")}`;
	return {
		text,
		context: buildNodeListContext(nodes, parentPath, totalCount, truncated),
	};
}

/**
 * Summary mode: Essential info with types
 */
function formatSummary(
	nodes: TdNode[],
	parentPath: string,
	totalCount: number,
	truncated: boolean,
): TextWithContext {
	const header = `Found ${totalCount} nodes in ${parentPath}:

`;
	const groups = buildGroups(nodes);
	const sections = groups.map((group) => {
		const nodeLines = group.nodes.map((n) => `  • ${n.name} [${n.path}]`);
		return `${group.type}:
${nodeLines.join("\n")}`;
	});
	return {
		text: header + sections.join("\n\n"),
		context: {
			parentPath,
			totalCount,
			groups,
			truncated,
			omittedCount: Math.max(totalCount - nodes.length, 0),
		},
	};
}

/**
 * Detailed mode: Full information (original behavior)
 */
function formatDetailed(
	nodes: TdNode[],
	data: NodeListData,
	format: PresenterFormat | undefined,
	parentPath: string,
): string {
	const title = `Nodes in ${parentPath}`;
	const payloadFormat = format ?? DEFAULT_PRESENTER_FORMAT;
	return presentStructuredData(
		{
			text: title,
			detailLevel: "detailed",
			structured: { ...data, nodes },
			context: {
				title,
				payloadFormat,
			},
			template: "detailedPayload",
		},
		payloadFormat,
	);
}

function buildNodeListContext(
	nodes: TdNode[],
	parentPath: string,
	totalCount: number,
	truncated: boolean,
): NodeListContext {
	return {
		parentPath,
		totalCount,
		groups: buildGroups(nodes),
		truncated,
		omittedCount: Math.max(totalCount - nodes.length, 0),
	};
}

function buildGroups(nodes: TdNode[]) {
	const byType = new Map<string, TdNode[]>();
	for (const node of nodes) {
		const type = node.opType || "unknown";
		if (!byType.has(type)) {
			byType.set(type, []);
		}
		byType.get(type)?.push(node);
	}
	return Array.from(byType.entries()).map(([type, typeNodes]) => ({
		type,
		count: typeNodes.length,
		nodes: typeNodes.map((n) => ({ name: n.name, path: n.path })),
	}));
}

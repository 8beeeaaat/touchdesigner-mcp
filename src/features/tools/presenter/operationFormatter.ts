import type {
	CheckNodeErrors200ResponseData,
	CreateNode200ResponseData,
	DeleteNode200ResponseData,
	ExecNodeMethod200ResponseData,
	GetTdInfo200ResponseData,
	UpdateNode200ResponseData,
} from "../../../gen/endpoints/TouchDesignerAPI.js";
import type { FormatterOptions } from "./responseFormatter.js";
import {
	finalizeFormattedText,
	mergeFormatterOptions,
} from "./responseFormatter.js";

type FormatterOpts = Pick<FormatterOptions, "detailLevel" | "responseFormat">;

export function formatTdInfo(
	data: GetTdInfo200ResponseData,
	options?: FormatterOpts,
): string {
	const opts = mergeFormatterOptions(options);
	if (!data) {
		return finalizeFormattedText("TouchDesigner info not available.", opts, {
			context: { title: "TouchDesigner Info" },
		});
	}

	const summary = `Server: ${data.server}\nVersion: ${data.version}`;
	const osLine = data.osName
		? `\nOS: ${data.osName} ${data.osVersion ?? ""}`
		: "";
	const text =
		opts.detailLevel === "minimal"
			? `Server: ${data.server}, v${data.version}`
			: `${summary}${osLine}`;

	return finalizeFormattedText(text.trim(), opts, {
		context: { title: "TouchDesigner Info", ...data },
		structured: data,
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
	});
}

export function formatCreateNodeResult(
	data: CreateNode200ResponseData,
	options?: FormatterOpts,
): string {
	const opts = mergeFormatterOptions(options);
	const node = data?.result;
	if (!node) {
		return finalizeFormattedText(
			"Node created but no metadata returned.",
			opts,
			{
				context: { title: "Create Node" },
				structured: data,
			},
		);
	}

	const name = node.name ?? "(unknown)";
	const path = node.path ?? "(path unknown)";
	const opType = node.opType ?? "unknown";
	const base = `✓ Created node '${name}' (${opType}) at ${path}`;
	const propCount = Object.keys(node.properties ?? {}).length;
	const text =
		opts.detailLevel === "minimal"
			? base
			: `${base}\nProperties detected: ${propCount}`;

	return finalizeFormattedText(text, opts, {
		context: { opType, path, title: "Create Node" },
		structured: data,
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
	});
}

export function formatUpdateNodeResult(
	data: UpdateNode200ResponseData,
	options?: FormatterOpts,
): string {
	const opts = mergeFormatterOptions(options);
	const updatedCount = data?.updated?.length ?? 0;
	const failedCount = data?.failed?.length ?? 0;
	const base = `✓ Updated ${updatedCount} parameter(s)`;
	const text =
		opts.detailLevel === "minimal"
			? base
			: `${base}${failedCount ? `, ${failedCount} failed` : ""}`;

	const context = {
		failed: data?.failed,
		message: data?.message,
		title: "Update Node",
		updated: data?.updated,
	};

	return finalizeFormattedText(text, opts, {
		context,
		structured: data,
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
	});
}

export function formatDeleteNodeResult(
	data: DeleteNode200ResponseData,
	options?: FormatterOpts,
): string {
	const opts = mergeFormatterOptions(options);
	const deleted = data?.deleted ?? false;
	const name = data?.node?.name ?? "node";
	const path = data?.node?.path ?? "(path unknown)";
	const text = deleted
		? `🗑️ Deleted '${name}' at ${path}`
		: `Deletion status unknown for '${name}' at ${path}`;

	return finalizeFormattedText(text, opts, {
		context: { deleted, path, title: "Delete Node" },
		structured: data,
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
	});
}

export function formatExecNodeMethodResult(
	data: ExecNodeMethod200ResponseData | { result?: unknown } | null | undefined,
	context: {
		nodePath: string;
		method: string;
		args?: unknown[];
		kwargs?: Record<string, unknown>;
	},
	options?: FormatterOpts,
): string {
	const opts = mergeFormatterOptions(options);
	const callSignature = buildCallSignature(context);
	const resultPreview = summarizeValue(data?.result);
	const text = `${callSignature}\nResult: ${resultPreview}`;

	return finalizeFormattedText(text, opts, {
		context: { callSignature, title: "Execute Node Method" },
		structured: { ...context, result: data?.result },
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
	});
}

export function formatCheckNodeErrorsResult(
	data: CheckNodeErrors200ResponseData,
	nodePath: string,
	options?: FormatterOpts,
): string {
	const opts = mergeFormatterOptions(options);

	const nodeErrors = data?.errors ?? [];
	const hasNodeErrors = nodeErrors.length > 0;

	// Warning note about container node limitations
	const containerNote =
		opts.detailLevel !== "minimal"
			? "\n\nNote: Container nodes (like baseCOMP, containerCOMP, etc.) may require calling cook() or opening the container before errors in dynamically created children are detected."
			: "";

	if (!hasNodeErrors) {
		const text =
			opts.detailLevel === "minimal"
				? "✓ No errors"
				: `✓ No errors found in node '${nodePath}'${containerNote}`;
		return finalizeFormattedText(text, opts, {
			context: { errorCount: 0, nodePath, title: "Check Node Errors" },
			structured: data,
		});
	}

	let text = "";
	if (hasNodeErrors) {
		const errorList =
			opts.detailLevel === "minimal"
				? `${nodeErrors.length} error(s)`
				: nodeErrors.map((err, i) => `${i + 1}. ${err}`).join("\n");
		text =
			opts.detailLevel === "minimal"
				? `⚠️ ${errorList} in '${nodePath}'`
				: `⚠️ Errors in '${nodePath}':\n${errorList}${containerNote}`;
	}

	return finalizeFormattedText(text, opts, {
		context: {
			errorCount: nodeErrors.length,
			nodePath,
			title: "Check Node Errors",
		},
		structured: data,
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
	});
}

function buildCallSignature(params: {
	nodePath: string;
	method: string;
	args?: unknown[];
	kwargs?: Record<string, unknown>;
}): string {
	const argPart = params.args ?? [];
	const kwPart = params.kwargs
		? Object.entries(params.kwargs).map(
				([key, value]) => `${key}=${JSON.stringify(value)}`,
			)
		: [];
	const joinedArgs = [...argPart.map(stringifyValue), ...kwPart].join(", ");
	return `op('${params.nodePath}').${params.method}(${joinedArgs})`;
}

function summarizeValue(value: unknown): string {
	if (value === undefined) return "(no result)";
	if (value === null) return "null";
	if (typeof value === "string")
		return value.length > 120 ? `${value.slice(0, 117)}...` : value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (Array.isArray(value)) return `Array[${value.length}]`;
	if (typeof value === "object")
		return `Object{${Object.keys(value).length} keys}`;
	return String(value);
}

function stringifyValue(value: unknown): string {
	if (typeof value === "string") return `'${value}'`;
	return JSON.stringify(value);
}

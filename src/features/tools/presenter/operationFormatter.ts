import type {
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
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
		context: { title: "TouchDesigner Info", ...data },
		structured: data,
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
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
		context: { title: "Create Node", path, opType },
		structured: data,
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
		title: "Update Node",
		updated: data?.updated,
		failed: data?.failed,
		message: data?.message,
	};

	return finalizeFormattedText(text, opts, {
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
		context,
		structured: data,
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
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
		context: { title: "Delete Node", path, deleted },
		structured: data,
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
		template: opts.detailLevel === "detailed" ? "detailedPayload" : "default",
		context: { title: "Execute Node Method", callSignature },
		structured: { ...context, result: data?.result },
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

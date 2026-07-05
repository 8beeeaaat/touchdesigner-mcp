/**
 * Script Result Formatter
 *
 * Formats Python script execution results with token optimization.
 * Used by EXECUTE_PYTHON_SCRIPT tool.
 */

import {
	DEFAULT_PRESENTER_FORMAT,
	type PresenterFormat,
	presentStructuredData,
} from "./presenter.js";
import type { FormatterOptions } from "./responseFormatter.js";
import {
	finalizeFormattedText,
	mergeFormatterOptions,
} from "./responseFormatter.js";

/**
 * Script execution result structure
 */
export interface ScriptResultData {
	success?: boolean;
	data?: {
		result?: unknown;
		stdout?: string;
		stderr?: string;
		error?: string;
	};
	[key: string]: unknown;
}

interface ScriptSummaryContext {
	snippet: string;
	resultType: string;
	resultPreview: string;
	hasOutput: boolean;
	outputType: string;
	outputPreview?: string;
	hasStderr: boolean;
	stderrPreview?: string;
}

/**
 * Format script execution result
 */
export function formatScriptResult(
	data: ScriptResultData | undefined,
	scriptSnippet?: string,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data) {
		return "No result returned.";
	}

	const success = data.success ?? true;
	const result = data.data?.result;
	const stdout = data.data?.stdout;
	const stderr = data.data?.stderr;
	const error = data.data?.error;

	// Error case - always show full details
	if (!success || error) {
		return formatError(error, scriptSnippet);
	}

	if (opts.detailLevel === "detailed") {
		return formatDetailed(data, opts.responseFormat);
	}

	let formattedText = "";
	let context: ScriptSummaryContext | undefined;

	switch (opts.detailLevel) {
		case "minimal":
			formattedText = formatMinimal(result);
			context = buildScriptContext(scriptSnippet, result, stdout, stderr);
			break;
		case "summary": {
			const summary = formatSummary(result, stdout, stderr, scriptSnippet);
			formattedText = summary.text;
			context = summary.context;
			break;
		}
	}

	const ctx = context as unknown as Record<string, unknown> | undefined;
	return finalizeFormattedText(formattedText, opts, {
		context: ctx,
		structured: ctx,
		template: "scriptSummary",
	});
}

/**
 * Format error result
 */
function formatError(error: unknown, scriptSnippet?: string): string {
	const errorMsg = typeof error === "string" ? error : JSON.stringify(error);
	const snippet = scriptSnippet
		? `\nScript: ${truncateScript(scriptSnippet)}`
		: "";
	return `❌ Script execution failed:${snippet}\n\nError: ${errorMsg}`;
}

/**
 * Minimal mode: Just the result value
 */
function formatMinimal(result: unknown): string {
	if (result === undefined || result === null) {
		return "✓ Script executed successfully (no return value)";
	}

	if (
		typeof result === "string" ||
		typeof result === "number" ||
		typeof result === "boolean"
	) {
		return `✓ Result: ${result}`;
	}

	if (Array.isArray(result)) {
		return `✓ Result: Array[${result.length}]`;
	}

	if (typeof result === "object") {
		const keys = Object.keys(result);
		return `✓ Result: Object{${keys.length} keys}`;
	}

	return `✓ Result: ${String(result)}`;
}

/**
 * Summary mode: Result with context
 */
function formatSummary(
	result: unknown,
	stdout?: string,
	stderr?: string,
	scriptSnippet?: string,
): { text: string; context: ScriptSummaryContext } {
	let formatted = "✓ Script executed successfully\n\n";
	const snippet = scriptSnippet ? truncateScript(scriptSnippet) : "";
	if (snippet) {
		formatted += `Script: ${snippet}\n\n`;
	}
	let resultPreview = "(none)";
	if (result !== undefined && result !== null) {
		resultPreview = formatResultValue(result, 500);
		formatted += `Result: ${resultPreview}\n`;
	}
	const outputPreview = truncateOutput(stdout);
	if (outputPreview) {
		formatted += `\nOutput:\n${outputPreview}`;
	}
	const stderrPreview = truncateOutput(stderr);
	if (stderrPreview) {
		formatted += `\nStderr:\n${stderrPreview}`;
	}
	return {
		context: {
			hasOutput: Boolean(outputPreview),
			hasStderr: Boolean(stderrPreview),
			outputPreview,
			outputType: getValueType(stdout),
			resultPreview,
			resultType: getValueType(result),
			snippet,
			stderrPreview,
		},
		text: formatted,
	};
}

function buildScriptContext(
	scriptSnippet: string | undefined,
	result: unknown,
	stdout?: string,
	stderr?: string,
): ScriptSummaryContext {
	return {
		hasOutput: Boolean(stdout?.trim()),
		hasStderr: Boolean(stderr?.trim()),
		outputPreview: stdout,
		outputType: getValueType(stdout),
		resultPreview: formatResultValue(result ?? "", 200),
		resultType: getValueType(result),
		snippet: scriptSnippet ? truncateScript(scriptSnippet) : "",
		stderrPreview: stderr,
	};
}

/**
 * Truncate captured stdout/stderr for display
 */
function truncateOutput(output?: string): string | undefined {
	if (!output?.trim()) {
		return undefined;
	}
	return output.length > 200 ? `${output.substring(0, 200)}...` : output;
}

/**
 * Detailed mode: Full JSON
 */
function formatDetailed(
	data: ScriptResultData,
	format: PresenterFormat | undefined,
): string {
	const title = "Script Result";
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

function getValueType(value: unknown): string {
	if (value === undefined || value === null) {
		return "none";
	}
	if (Array.isArray(value)) {
		return `array(${value.length})`;
	}
	return typeof value;
}

/**
 * Format result value with size limit
 */
function formatResultValue(value: unknown, maxChars: number): string {
	const str =
		typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);

	if (str.length <= maxChars) {
		return str;
	}

	return `${str.substring(0, maxChars)}...\n💡 Result truncated. Use detailLevel='detailed' for full output.`;
}

/**
 * Truncate script for display
 */
function truncateScript(script: string, maxLength = 100): string {
	const trimmed = script.trim();
	if (trimmed.length <= maxLength) {
		return trimmed;
	}

	const firstLine = trimmed.split("\n")[0];
	if (firstLine.length <= maxLength) {
		return `${firstLine}...`;
	}

	return `${trimmed.substring(0, maxLength)}...`;
}

/**
 * Response Formatter Utilities
 *
 * Provides token-optimized formatting for MCP tool responses.
 * Based on the design document: docs/context-optimization-design.md
 */

/**
 * Detail level for response formatting
 * - minimal: Only essential information (lowest tokens)
 * - summary: Key information with counts and hints (balanced)
 * - detailed: Full information (original behavior)
 */
export type DetailLevel = "minimal" | "summary" | "detailed";

/**
 * Common formatting options
 */
import { type PresenterFormat, presentStructuredData } from "./presenter.js";

export interface FormatterOptions {
	/**
	 * Backwards-compatible alias for detailLevel
	 * @deprecated Use detailLevel instead
	 */
	mode?: DetailLevel;

	/**
	 * Level of detail in the response
	 * @default "summary"
	 */
	detailLevel?: DetailLevel;

	/**
	 * Maximum number of items to include in lists
	 * @default undefined (no limit)
	 */
	limit?: number;

	/**
	 * Include hints about omitted content
	 * @default true
	 */
	includeHints?: boolean;

	/**
	 * Structured output format for detailed mode
	 * @default "yaml"
	 */
	responseFormat?: PresenterFormat;
}

/**
 * Default formatter options
 */
export const DEFAULT_FORMATTER_OPTIONS = {
	detailLevel: "summary",
	includeHints: true,
	limit: undefined as number | undefined,
	responseFormat: undefined as PresenterFormat | undefined,
} satisfies FormatterOptions;

/**
 * Merge user options with defaults
 */
export function mergeFormatterOptions(options?: FormatterOptions): {
	detailLevel: DetailLevel;
	limit: number | undefined;
	includeHints: boolean;
	responseFormat?: PresenterFormat;
} {
	const merged = { ...DEFAULT_FORMATTER_OPTIONS, ...options };
	const detailLevel =
		options?.detailLevel ??
		options?.mode ??
		DEFAULT_FORMATTER_OPTIONS.detailLevel;
	return {
		detailLevel,
		includeHints: merged.includeHints ?? true,
		limit: merged.limit,
		responseFormat: merged.responseFormat,
	};
}

interface FormatterMetadata {
	template?: string;
	context?: Record<string, unknown>;
	structured?: unknown;
}

export function finalizeFormattedText(
	text: string,
	opts: {
		responseFormat?: PresenterFormat;
		detailLevel: DetailLevel;
	},
	metadata?: FormatterMetadata,
): string {
	const chosenFormat =
		opts.responseFormat ??
		(opts.detailLevel === "detailed" ? "yaml" : "markdown");

	return presentStructuredData(
		{
			context: metadata?.context,
			detailLevel: opts.detailLevel,
			structured: metadata?.structured,
			template: metadata?.template,
			text,
		},
		chosenFormat,
	);
}

/**
 * Format a hint message for omitted content
 */
export function formatOmissionHint(
	totalCount: number,
	shownCount: number,
	itemType: string,
): string {
	const omitted = totalCount - shownCount;
	if (omitted <= 0) return "";
	return `\n💡 ${omitted} more ${itemType}(s) omitted. Use detailLevel='detailed' or increase limit to see all.`;
}

/**
 * Truncate array based on limit option
 */
export function limitArray<T>(
	items: T[],
	limit: number | undefined,
): { items: T[]; truncated: boolean } {
	if (limit === undefined || limit >= items.length) {
		return { items, truncated: false };
	}
	return {
		items: items.slice(0, limit),
		truncated: true,
	};
}

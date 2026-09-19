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

/**
 * What `limit` removed from the structured payload.
 *
 * `json` and `yaml` render `structured` and nothing else — no markdown hint
 * reaches them — so a payload cut down to `limit` items has to carry the fact
 * itself. Without it the caller cannot tell a capped list from a short one,
 * which is the same defect as ignoring `limit`, one layer down.
 *
 * The counts are per collection because a single `limit` binds several: an
 * error report caps its entries and each of its three caveat lists, and a
 * reader deciding whether to ask again needs to know which one ran out.
 */
export interface TruncationNotice {
	/** The cap the caller asked for. */
	limit: number;
	/** Only the collections that actually lost items. */
	collections: Record<
		string,
		{ total: number; returned: number; omitted: number }
	>;
}

interface FormatterMetadata {
	template?: string;
	context?: Record<string, unknown>;
	structured?: unknown;
	/**
	 * What `limit` cut from `structured`, as built by `describeTruncation`.
	 *
	 * Present only when something was actually removed, which is what keeps a
	 * response for a caller who passed no `limit` byte for byte what it was.
	 */
	truncation?: TruncationNotice;
}

/**
 * Describe what a formatter's caps removed, or nothing if they removed nothing.
 *
 * Only the formatter knows which of its collections `limit` binds, so it
 * declares them here rather than this layer guessing at the payload's shape.
 * Collections that kept every item are left out: the notice exists to report a
 * loss, and listing intact collections would bury the one that was cut.
 */
export function describeTruncation(
	limit: number | undefined,
	collections: Record<string, { total: number; returned: number }>,
): TruncationNotice | undefined {
	if (limit === undefined) {
		return undefined;
	}

	const cut: TruncationNotice["collections"] = {};
	for (const [name, { returned, total }] of Object.entries(collections)) {
		const omitted = Math.max(total - returned, 0);
		if (omitted > 0) {
			cut[name] = { omitted, returned, total };
		}
	}

	return Object.keys(cut).length === 0
		? undefined
		: { collections: cut, limit };
}

/**
 * Stamp the structured payload with the record of what was left out.
 *
 * `truncated: true` rides along with the detail because it is the field a
 * reader skimming the payload will look for, and because a formatter whose
 * context already carries a `truncated` flag may have set it for a different
 * question — `nodeListFormatter` uses its copy to decide whether to print a
 * markdown hint, and suppressing the hint must not make the data claim it is
 * complete.
 */
function withTruncationNotice(
	structured: unknown,
	truncation: TruncationNotice | undefined,
): unknown {
	if (truncation === undefined) {
		return structured;
	}
	if (
		typeof structured !== "object" ||
		structured === null ||
		Array.isArray(structured)
	) {
		// Nothing to merge into. Every formatter that declares a truncation
		// hands over an object, so this is unreachable rather than a policy.
		return structured;
	}
	return { ...structured, truncated: true, truncation };
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
			structured: withTruncationNotice(
				metadata?.structured,
				metadata?.truncation,
			),
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

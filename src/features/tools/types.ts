import { z } from "zod";

/**
 * Shared Zod schemas for MCP tool formatting parameters.
 * These stay on the TypeScript side only and are not sent to TouchDesigner.
 */

export const detailLevelSchema = z
	.enum(["minimal", "summary", "detailed"] as const)
	.describe(
		"Response detail level for tool output (minimal, summary, or detailed)",
	);

export const limitSchema = z
	.number()
	.int()
	.min(1)
	.max(500)
	.describe("Maximum number of items to include in formatted output");

export const presenterFormatSchema = z
	.enum(["json", "yaml", "markdown"] as const)
	.describe("Structured output format for formatted responses");

export const detailOnlyFormattingSchema = z.object({
	detailLevel: detailLevelSchema.optional(),
	responseFormat: presenterFormatSchema.optional(),
});

export const formattingOptionsSchema = z.object({
	detailLevel: detailLevelSchema.optional(),
	limit: limitSchema.optional(),
	responseFormat: presenterFormatSchema.optional(),
});

export type DetailOnlyFormattingParams = z.input<
	typeof detailOnlyFormattingSchema
>;
export type FormattingOptionsParams = z.input<typeof formattingOptionsSchema>;

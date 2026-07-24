import { z } from "zod";
import { LIFECYCLE_TOOL_DEFINITIONS } from "./lifecycleToolDefinitions.js";
import {
	catalogEntryJson,
	slimSchemaForMcp,
} from "./slimSchemaForMcp.js";
import { TOE_TOOL_DEFINITIONS } from "./toeToolDefinitions.js";
import { TOOL_DEFINITIONS } from "./toolDefinitions.js";
import { detailOnlyFormattingSchema } from "./types.js";

const TOE_DROP_KEYS = [
	"tdExe",
	"refresh",
	"relativeDepth",
	"around",
	"refKind",
	"maxChars",
	"maxNodes",
	"maxParms",
	"radius",
];

/**
 * Build the published tools/list catalog (same set registerTdTools registers).
 */
export function buildPublishedToolCatalog(): Array<{
	name: string;
	description: string;
	inputSchema: unknown;
}> {
	const tools: Array<{
		name: string;
		description: string;
		inputSchema: unknown;
	}> = [];

	for (const definition of TOOL_DEFINITIONS) {
		tools.push(
			catalogEntryJson(
				definition.name,
				definition.description,
				definition.schema,
			),
		);
	}

	for (const definition of LIFECYCLE_TOOL_DEFINITIONS) {
		tools.push(
			catalogEntryJson(
				definition.name,
				definition.description,
				definition.schema,
			),
		);
	}

	for (const definition of TOE_TOOL_DEFINITIONS) {
		tools.push(
			catalogEntryJson(
				definition.name,
				definition.description,
				definition.schema,
				{ dropKeys: TOE_DROP_KEYS },
			),
		);
	}

	const describeSchema = detailOnlyFormattingSchema.extend({
		filter: z.string().min(1).optional(),
	});
	tools.push(
		catalogEntryJson(
			"describe_td_tools",
			"Manifest of registered TD MCP tools",
			describeSchema,
		),
	);

	return tools;
}

/** Compact JSON of the tools/list-shaped catalog. */
export function serializeToolCatalog(
	tools = buildPublishedToolCatalog(),
): string {
	return JSON.stringify({ tools });
}

/**
 * Token estimate for dense JSON schemas.
 * Calibrated to the pre-slim GetMcpTools dump (~29.5 KB ≈ ~20k tokenizer tokens)
 * → ~1.5 chars/token. Label as `est.` unless a real tokenizer is used.
 */
export function estimateCatalogTokens(chars: number): number {
	return Math.ceil(chars / 1.5);
}

export const CATALOG_TOKEN_BUDGET = 5000;

export function measureToolCatalog(tools = buildPublishedToolCatalog()): {
	toolCount: number;
	chars: number;
	bytes: number;
	tokensEst: number;
	underBudget: boolean;
	budget: number;
} {
	const json = serializeToolCatalog(tools);
	const chars = json.length;
	const tokensEst = estimateCatalogTokens(chars);
	return {
		budget: CATALOG_TOKEN_BUDGET,
		bytes: Buffer.byteLength(json, "utf8"),
		chars,
		tokensEst,
		toolCount: tools.length,
		underBudget: tokensEst <= CATALOG_TOKEN_BUDGET,
	};
}

/** Expose slim helper for tests that assert no property descriptions. */
export function publishedSchemaHasPropertyDescriptions(
	schema: z.ZodObject<z.ZodRawShape>,
): boolean {
	const slim = slimSchemaForMcp(schema);
	const js = z.toJSONSchema(slim) as {
		properties?: Record<string, { description?: string }>;
	};
	return Object.values(js.properties ?? {}).some(
		(p) => typeof p.description === "string" && p.description.length > 0,
	);
}

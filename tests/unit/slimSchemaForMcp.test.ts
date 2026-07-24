import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	measureToolCatalog,
	publishedSchemaHasPropertyDescriptions,
} from "../../src/features/tools/measureToolCatalog.js";
import {
	catalogEntryJson,
	slimSchemaForMcp,
} from "../../src/features/tools/slimSchemaForMcp.js";
import { TOOL_DEFINITIONS } from "../../src/features/tools/toolDefinitions.js";
import { getToeDigestSchema } from "../../src/features/tools/toeToolDefinitions.js";

describe("slimSchemaForMcp", () => {
	it("strips property descriptions from JSON Schema", () => {
		const schema = z
			.object({
				name: z.string().describe("human name"),
				level: z.enum(["minimal", "summary"]).optional().describe("detail"),
			})
			.strict();
		expect(publishedSchemaHasPropertyDescriptions(schema)).toBe(false);
		const js = z.toJSONSchema(slimSchemaForMcp(schema)) as {
			properties: Record<string, { description?: string }>;
		};
		expect(js.properties.name.description).toBeUndefined();
		expect(js.properties.level.description).toBeUndefined();
		expect(js.properties.level.enum).toEqual(["minimal", "summary"]);
	});

	it("drops responseFormat and limit from published schema", () => {
		const schema = z.object({
			path: z.string(),
			detailLevel: z.enum(["minimal", "summary", "detailed"]).optional(),
			responseFormat: z.enum(["json", "yaml", "markdown"]).optional(),
			limit: z.number().optional(),
		});
		const slim = slimSchemaForMcp(schema);
		expect(Object.keys(slim.shape)).toEqual(["path", "detailLevel"]);
	});

	it("preserves enums; constraints live on full schema re-validation", () => {
		const schema = z.object({
			pattern: z.string().default("*"),
			maxDepth: z.number().int().min(0).max(32).optional(),
			mode: z.enum(["outline", "brief"]).optional(),
		});
		const slim = slimSchemaForMcp(schema);
		expect(slim.parse({})).toEqual({});
		expect(slim.parse({ maxDepth: 99 })).toEqual({ maxDepth: 99 });
		expect(Object.keys(slim.shape)).toContain("mode");
		expect(() => schema.parse({ maxDepth: 99 })).toThrow();
	});
});

describe("measureToolCatalog", () => {
	it("builds a catalog under the token budget", () => {
		const result = measureToolCatalog();
		expect(result.toolCount).toBeGreaterThan(20);
		expect(result.chars).toBeGreaterThan(0);
		expect(result.underBudget).toBe(true);
		expect(result.tokensEst).toBeLessThanOrEqual(result.budget);
	});

	it("publishes no property descriptions for OpenAPI tools", () => {
		for (const definition of TOOL_DEFINITIONS) {
			const entry = catalogEntryJson(
				definition.name,
				definition.description,
				definition.schema,
			);
			const props = (
				entry.inputSchema as {
					properties?: Record<string, { description?: string }>;
				}
			).properties;
			for (const prop of Object.values(props ?? {})) {
				expect(prop.description).toBeUndefined();
			}
			expect(
				(entry.inputSchema as { properties?: Record<string, unknown> })
					.properties?.responseFormat,
			).toBeUndefined();
			expect(
				(entry.inputSchema as { properties?: Record<string, unknown> })
					.properties?.limit,
			).toBeUndefined();
		}
	});

	it("publishes slim toe digest schema without mode essay or advanced knobs", () => {
		const entry = catalogEntryJson(
			"get_toe_digest",
			"short",
			getToeDigestSchema,
			{
				dropKeys: [
					"tdExe",
					"refresh",
					"relativeDepth",
					"around",
					"refKind",
					"maxChars",
					"maxNodes",
					"maxParms",
					"radius",
				],
			},
		);
		const props = (
			entry.inputSchema as {
				properties?: Record<
					string,
					{ description?: string; enum?: string[] }
				>;
			}
		).properties;
		expect(props?.mode?.description).toBeUndefined();
		expect(props?.mode?.enum?.length).toBeGreaterThan(3);
		expect(props?.tdExe).toBeUndefined();
		expect(props?.toePath).toBeDefined();
	});
});

import { z } from "zod";

const DROP_FROM_PUBLISH = new Set(["responseFormat", "limit"]);

/**
 * Rebuild a Zod field as type + enum only (no descriptions, no min/max,
 * defaults → optional). Full schemas stay on tool definitions for
 * `describe_td_tools` and handler re-validation.
 */
function stripFieldForPublish(field: z.ZodType): z.ZodType {
	const wrappers: Array<"optional" | "nullable"> = [];
	let node: z.ZodType = field;

	while (node.def) {
		const type = node.def.type;
		const inner = (node.def as { innerType?: z.ZodType }).innerType;
		if (
			(type === "optional" || type === "default" || type === "prefault") &&
			inner
		) {
			wrappers.push("optional");
			node = inner;
			continue;
		}
		if (type === "nullable" && inner) {
			wrappers.push("nullable");
			node = inner;
			continue;
		}
		break;
	}

	let out = rebuildBaseLean(node);
	for (let i = wrappers.length - 1; i >= 0; i--) {
		const w = wrappers[i];
		if (w === "optional") out = out.optional();
		else if (w === "nullable") out = out.nullable();
	}
	return out;
}

function rebuildBaseLean(node: z.ZodType): z.ZodType {
	const type = node.def?.type;

	switch (type) {
		case "string":
			return z.string();
		case "number":
		case "int":
			return z.number();
		case "boolean":
			return z.boolean();
		case "enum": {
			const entries = (node.def as { entries?: Record<string, string> })
				.entries;
			const values = Object.values(entries ?? {});
			if (values.length === 0) return z.string();
			return z.enum(values as [string, ...string[]]);
		}
		case "array": {
			const element = (node.def as { element?: z.ZodType }).element;
			return z.array(element ? stripFieldForPublish(element) : z.unknown());
		}
		case "record": {
			const def = node.def as { valueType?: z.ZodType };
			const value = def.valueType
				? stripFieldForPublish(def.valueType)
				: z.unknown();
			return z.record(z.string(), value);
		}
		case "union": {
			const options = (node.def as { options?: z.ZodType[] }).options ?? [];
			if (options.length < 2) return z.unknown();
			const stripped = options.map(stripFieldForPublish) as [
				z.ZodType,
				z.ZodType,
				...z.ZodType[],
			];
			return z.union(stripped);
		}
		case "unknown":
		case "any":
			return z.unknown();
		case "object": {
			const shape = (node as z.ZodObject<z.ZodRawShape>).shape;
			return slimSchemaForMcp(z.object(shape));
		}
		default:
			return z.unknown();
	}
}

export type SlimSchemaOptions = {
	/** Property names omitted from the published MCP schema (handlers keep defaults). */
	dropKeys?: Iterable<string>;
};

/**
 * MCP-facing schema: types + enums only; drops `responseFormat` and `limit`
 * (handlers default them). Full schemas stay on tool definitions for
 * `describe_td_tools` and handler re-validation.
 */
export function slimSchemaForMcp<S extends z.ZodObject<z.ZodRawShape>>(
	schema: S,
	options: SlimSchemaOptions = {},
): z.ZodObject<z.ZodRawShape> {
	const drop = new Set([...DROP_FROM_PUBLISH, ...(options.dropKeys ?? [])]);
	const slimShape: Record<string, z.ZodType> = {};
	for (const [key, field] of Object.entries(schema.shape)) {
		if (drop.has(key)) continue;
		slimShape[key] = stripFieldForPublish(field as z.ZodType);
	}
	// Non-strict publish: unknown keys ignored; full schema enforces later.
	return z.object(slimShape);
}

/** Optional advanced ToeDigest knobs — documented in toe-digest.md, not tools/list. */
const DROP_TOE_ADVANCED = [
	"tdExe",
	"refresh",
	"relativeDepth",
	"around",
	"refKind",
	"maxChars",
	"maxNodes",
	"maxParms",
	"radius",
] as const;

/** Shape object suitable for `server.tool(name, desc, shape, handler)`. */
export function slimShapeForMcp(
	schema: z.ZodObject<z.ZodRawShape>,
	options?: SlimSchemaOptions,
): z.ZodRawShape {
	return slimSchemaForMcp(schema, options).shape;
}

/** Publish shape for ToeDigest / inject tools (drops rare optional knobs). */
export function slimToeShapeForMcp(
	schema: z.ZodObject<z.ZodRawShape>,
): z.ZodRawShape {
	return slimSchemaForMcp(schema, { dropKeys: DROP_TOE_ADVANCED }).shape;
}

const JSON_SCHEMA_DROP = new Set([
	"$schema",
	"additionalProperties",
	"description",
	"default",
	"minimum",
	"maximum",
	"minLength",
	"maxLength",
	"exclusiveMinimum",
	"exclusiveMaximum",
]);

/** Strip verbose JSON Schema keys from a tools/list inputSchema. */
export function leanJsonSchema(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(leanJsonSchema);
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			if (JSON_SCHEMA_DROP.has(k)) continue;
			out[k] = leanJsonSchema(v);
		}
		return out;
	}
	return value;
}

/** Compact tools/list-style catalog entry from a Zod object schema. */
export function catalogEntryJson(
	name: string,
	description: string,
	schema: z.ZodObject<z.ZodRawShape>,
	options?: SlimSchemaOptions,
): { name: string; description: string; inputSchema: unknown } {
	const slim = slimSchemaForMcp(schema, options);
	const inputSchema = leanJsonSchema(z.toJSONSchema(slim)) as Record<
		string,
		unknown
	>;
	// Match MCP SDK tools/list overhead so budget tracks live catalog cost.
	inputSchema.$schema = "http://json-schema.org/draft-07/schema#";
	return { description, inputSchema, name };
}

/** Recursively strip `description` keys (for measuring raw vs slim). */
export function stripJsonDescriptions(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(stripJsonDescriptions);
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			if (k === "description") continue;
			out[k] = stripJsonDescriptions(v);
		}
		return out;
	}
	return value;
}

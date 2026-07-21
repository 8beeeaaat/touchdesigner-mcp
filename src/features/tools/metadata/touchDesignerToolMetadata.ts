import type { z } from "zod";
import type { ToolNames } from "../index.js";
import { LIFECYCLE_TOOL_DEFINITIONS } from "../lifecycleToolDefinitions.js";
import {
	TOOL_DEFINITIONS,
	type ToolCategory,
	type ToolMetadataSource,
} from "../toolDefinitions.js";

export type { ToolCategory, ToolMetadataSource };

export interface ToolParameterMetadata {
	name: string;
	type: string;
	required: boolean;
	description?: string;
}

export interface ToolMetadata {
	tool: ToolNames;
	modulePath: string;
	functionName: string;
	description: string;
	category: ToolCategory;
	parameters: ToolParameterMetadata[];
	returns: string;
	example: string;
	notes?: string;
}

const MODULE_ROOT = "servers/touchdesigner";

/** snake_case tool name -> camelCase function name (e.g. get_td_info -> getTdInfo). */
function toFunctionName(toolName: string): string {
	return toolName.replace(/_(.)/g, (_, char: string) => char.toUpperCase());
}

/**
 * Builds the `describe_td_tools` manifest from tool metadata sources. Parameter
 * metadata is introspected from each tool's Zod schema, so it always reflects
 * the schema that is actually registered.
 */
export function buildToolMetadata(
	definitions: readonly ToolMetadataSource[] = TOOL_DEFINITIONS,
): ToolMetadata[] {
	return definitions.map((definition) => {
		const functionName = toFunctionName(definition.name);
		return {
			category: definition.category,
			description: definition.description,
			example: definition.example,
			functionName,
			modulePath: `${MODULE_ROOT}/${functionName}.ts`,
			notes: definition.notes,
			parameters: deriveParameters(definition.schema),
			returns: definition.returns,
			tool: definition.name,
		};
	});
}

/** Full manifest: OpenAPI-backed tools + target/lifecycle tools. */
export function buildRegisteredToolMetadata(): ToolMetadata[] {
	return [
		...buildToolMetadata(TOOL_DEFINITIONS),
		...buildToolMetadata(LIFECYCLE_TOOL_DEFINITIONS),
	];
}

/** Introspects a Zod object schema into flat parameter metadata. */
export function deriveParameters(
	schema: z.ZodObject<z.ZodRawShape>,
): ToolParameterMetadata[] {
	return Object.entries(schema.shape).map(([name, field]) => {
		const { base, description, required } = unwrap(field);
		return {
			description,
			name,
			required,
			type: renderType(base),
		};
	});
}

interface ZodDef {
	type?: string;
	innerType?: ZodNode;
	element?: ZodNode;
	keyType?: ZodNode;
	valueType?: ZodNode;
	options?: ZodNode[];
	entries?: Record<string, string | number>;
}

interface ZodNode {
	description?: string;
	def?: ZodDef;
}

/** Peels optional/default/nullable wrappers to reach the base type. */
function unwrap(field: unknown): {
	base: ZodNode;
	description?: string;
	required: boolean;
} {
	let node = field as ZodNode;
	let description = node.description;
	let required = true;

	while (node.def) {
		if (description === undefined && node.description) {
			description = node.description;
		}
		const type = node.def.type;
		if (
			type === "optional" ||
			type === "default" ||
			type === "prefault" ||
			type === "nullish"
		) {
			required = false;
		}
		if (
			(type === "optional" ||
				type === "default" ||
				type === "prefault" ||
				type === "nullable" ||
				type === "nullish") &&
			node.def.innerType
		) {
			node = node.def.innerType;
			continue;
		}
		break;
	}

	return { base: node, description: description ?? node.description, required };
}

/** Renders a base Zod type as a TypeScript-flavored type string. */
function renderType(node: ZodNode): string {
	const def = node.def;
	switch (def?.type) {
		case "enum":
			return Object.values(def.entries ?? {})
				.map((value) => `'${value}'`)
				.join(" | ");
		case "string":
			return "string";
		case "number":
		case "int":
			return "number";
		case "boolean":
			return "boolean";
		case "array":
			return `Array<${def.element ? renderType(def.element) : "unknown"}>`;
		case "record":
			return `Record<${def.keyType ? renderType(def.keyType) : "string"}, ${
				def.valueType ? renderType(def.valueType) : "unknown"
			}>`;
		case "union":
			return (def.options ?? []).map(renderType).join(" | ");
		case "unknown":
		case "any":
			return "unknown";
		case "object":
			return "object";
		default:
			return def?.type ?? "unknown";
	}
}

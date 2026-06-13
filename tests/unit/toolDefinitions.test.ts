import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../../src/core/constants.js";
import {
	buildToolMetadata,
	deriveParameters,
} from "../../src/features/tools/metadata/touchDesignerToolMetadata.js";
import { TOOL_DEFINITIONS } from "../../src/features/tools/toolDefinitions.js";

describe("TOOL_DEFINITIONS", () => {
	it("registers every operational tool exactly once with a description", () => {
		const names = TOOL_DEFINITIONS.map((definition) => definition.name);
		expect(new Set(names).size).toBe(names.length);
		// describe_td_tools is the meta tool and is intentionally excluded.
		expect(names).not.toContain(TOOL_NAMES.DESCRIBE_TD_TOOLS);
		for (const definition of TOOL_DEFINITIONS) {
			expect(definition.description.length).toBeGreaterThan(0);
		}
	});
});

describe("buildToolMetadata", () => {
	const metadata = buildToolMetadata();

	it("derives one manifest entry per tool definition", () => {
		expect(metadata).toHaveLength(TOOL_DEFINITIONS.length);
	});

	it("derives functionName and modulePath from the tool name", () => {
		const getNodes = metadata.find(
			(entry) => entry.tool === TOOL_NAMES.GET_TD_NODES,
		);
		expect(getNodes?.functionName).toBe("getTdNodes");
		expect(getNodes?.modulePath).toBe("servers/touchdesigner/getTdNodes.ts");
	});

	it("keeps description as the single source shared with registration", () => {
		for (const entry of metadata) {
			const definition = TOOL_DEFINITIONS.find((d) => d.name === entry.tool);
			expect(entry.description).toBe(definition?.description);
		}
	});
});

describe("deriveParameters", () => {
	const byTool = (tool: string) => {
		const definition = TOOL_DEFINITIONS.find((d) => d.name === tool);
		if (!definition) {
			throw new Error(`missing definition for ${tool}`);
		}
		return deriveParameters(definition.schema);
	};

	it("introspects required/optional api params plus formatting flags", () => {
		const params = byTool(TOOL_NAMES.GET_TD_NODES);
		const byName = Object.fromEntries(params.map((p) => [p.name, p]));

		expect(byName.parentPath).toMatchObject({ required: true, type: "string" });
		// `pattern` has a schema default, so it is optional for input.
		expect(byName.pattern).toMatchObject({ required: false, type: "string" });
		expect(byName.includeProperties).toMatchObject({
			required: false,
			type: "boolean",
		});
		expect(byName.detailLevel).toMatchObject({
			required: false,
			type: "'minimal' | 'summary' | 'detailed'",
		});
		expect(byName.limit).toMatchObject({ required: false, type: "number" });
		expect(byName.responseFormat?.type).toBe("'json' | 'yaml' | 'markdown'");
	});

	it("renders composite types (record, array<union>) from the schema", () => {
		const update = Object.fromEntries(
			byTool(TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS).map((p) => [p.name, p]),
		);
		expect(update.properties).toMatchObject({
			required: true,
			type: "Record<string, unknown>",
		});

		const exec = Object.fromEntries(
			byTool(TOOL_NAMES.EXECUTE_NODE_METHOD).map((p) => [p.name, p]),
		);
		expect(exec.args).toMatchObject({
			required: false,
			type: "Array<string | number | boolean>",
		});
		expect(exec.kwargs?.type).toBe("Record<string, unknown>");
	});

	it("carries parameter descriptions from the OpenAPI-derived schema", () => {
		const create = Object.fromEntries(
			byTool(TOOL_NAMES.CREATE_TD_NODE).map((p) => [p.name, p]),
		);
		expect(create.nodeType?.description).toContain(
			"Type of the node to create",
		);
	});
});

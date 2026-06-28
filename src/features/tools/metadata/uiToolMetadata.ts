import { TOOL_NAMES } from "../../../core/constants.js";
import {
	GetNodeErrorsQueryParams,
	GetNodeParSpecsQueryParams,
	GetNodesQueryParams,
} from "../../../gen/mcp/touchDesignerAPI.zod.js";
import {
	deriveParameters,
	type ToolMetadata,
} from "./touchDesignerToolMetadata.js";

const MODULE_ROOT = "servers/touchdesigner";

/** snake_case tool name -> camelCase function name (mirrors buildToolMetadata). */
function toFunctionName(toolName: string): string {
	return toolName.replace(/_(.)/g, (_, char: string) => char.toUpperCase());
}

/**
 * Manifest metadata for the MCP Apps UI tools.
 *
 * UI tools are registered separately (`registerUiTools` via `registerAppTool`)
 * and intentionally kept out of `TOOL_DEFINITIONS` to avoid double-registration.
 * They still belong in the `describe_td_tools` manifest so an agent can discover
 * them, so their metadata is declared here and merged in at manifest-build time.
 * Parameter metadata is introspected from the same OpenAPI-derived Zod schemas
 * the tools actually use, keeping the manifest in sync with the input contract.
 */
interface UiToolMetaInput {
	tool: ToolMetadata["tool"];
	description: string;
	schema: Parameters<typeof deriveParameters>[0];
	returns: string;
	example: string;
	notes?: string;
}

const UI_TOOL_INPUTS: UiToolMetaInput[] = [
	{
		description:
			"Browse nodes under a path as an interactive panel (MCP Apps UI). Renders the same data as get_td_nodes in a clickable widget; clicking a node opens the parameter editor.",
		example: `// Rendered by a host that supports MCP Apps; returns the same data as get_td_nodes.
// Tool input:
{ "parentPath": "/project1" }`,
		notes:
			"UI tool (MCP Apps widget). Hosts without the apps surface fall back to the text summary.",
		returns:
			"Node list (name, path, opType) rendered as an interactive widget.",
		schema: GetNodesQueryParams,
		tool: TOOL_NAMES.UI_TD_NODE_BROWSER,
	},
	{
		description:
			"Edit a node's parameters as an interactive form (MCP Apps UI). Renders style-aware inputs (slider/menu/toggle/pulse) grouped by page; writes back via update_td_node_parameters.",
		example: `// Rendered by a host that supports MCP Apps.
// Tool input:
{ "nodePath": "/project1/text1" }`,
		notes:
			"UI tool (MCP Apps widget). Reads full parameter specs; the host renders an editable panel.",
		returns:
			"Full parameter specs (style, page, range, menu, value) rendered as an editable form.",
		schema: GetNodeParSpecsQueryParams,
		tool: TOOL_NAMES.UI_TD_PARAM_EDITOR,
	},
	{
		description:
			"Inspect a node and its children for errors as an interactive dashboard (MCP Apps UI). Renders the same data as get_td_node_errors grouped by node; clicking a node opens the parameter editor.",
		example: `// Rendered by a host that supports MCP Apps; returns the same data as get_td_node_errors.
// Tool input:
{ "nodePath": "/project1" }`,
		notes:
			"UI tool (MCP Apps widget). Hosts without the apps surface fall back to the text summary.",
		returns:
			"Aggregated error report (errorCount, hasErrors, errors[]) rendered as a grouped dashboard.",
		schema: GetNodeErrorsQueryParams,
		tool: TOOL_NAMES.UI_TD_ERROR_DASHBOARD,
	},
];

/** UI tool manifest entries, shaped like the rest of the describe_td_tools data. */
export const UI_TOOL_METADATA: ToolMetadata[] = UI_TOOL_INPUTS.map((input) => {
	const functionName = toFunctionName(input.tool);
	return {
		category: "nodes",
		description: input.description,
		example: input.example,
		functionName,
		modulePath: `${MODULE_ROOT}/${functionName}.ts`,
		notes: input.notes,
		parameters: deriveParameters(input.schema),
		returns: input.returns,
		tool: input.tool,
	};
});

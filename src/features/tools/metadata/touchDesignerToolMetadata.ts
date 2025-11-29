import { TOOL_NAMES } from "../../../core/constants.js";
import type { ToolNames } from "../index.js";

export type ToolCategory = "system" | "python" | "nodes" | "classes" | "state";

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

export const TOUCH_DESIGNER_TOOL_METADATA: ToolMetadata[] = [
	{
		category: "system",
		description: "Get server information from TouchDesigner",
		example: `import { getTdInfo } from './servers/touchdesigner/getTdInfo';

const info = await getTdInfo();
console.log(\`\${info.server} \${info.version}\`);`,
		functionName: "getTdInfo",
		modulePath: `${MODULE_ROOT}/getTdInfo.ts`,
		parameters: [
			{
				description: "Optional presenter granularity for formatted output.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Overrides the formatter output format for automation.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns:
			"TouchDesigner build metadata (server, version, operating system).",
		tool: TOOL_NAMES.GET_TD_INFO,
	},
	{
		category: "python",
		description: "Execute arbitrary Python against the TouchDesigner session",
		example: `import { executePythonScript } from './servers/touchdesigner/executePythonScript';

await executePythonScript({
  script: "op('/project1/text1').par.text = 'Hello MCP'",
});`,
		functionName: "executePythonScript",
		modulePath: `${MODULE_ROOT}/executePythonScript.ts`,
		notes:
			"Wrap long-running scripts with logging so the agent can stream intermediate checkpoints.",
		parameters: [
			{
				description:
					"Python source that TouchDesigner will eval. Multiline scripts supported.",
				name: "script",
				required: true,
				type: "string",
			},
			{
				description:
					"Choose how much of the execution metadata to surface back to the agent.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Structured response encoding for downstream tooling.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns:
			"Result payload that mirrors `result` from the executed script (if set).",
		tool: TOOL_NAMES.EXECUTE_PYTHON_SCRIPT,
	},
	{
		category: "nodes",
		description: "List nodes below a parent path",
		example: `import { getTdNodes } from './servers/touchdesigner/getTdNodes';

const nodes = await getTdNodes({
  parentPath: '/project1',
  pattern: 'geo*',
});
console.log(nodes.nodes?.map(node => node.path));`,
		functionName: "getTdNodes",
		modulePath: `${MODULE_ROOT}/getTdNodes.ts`,
		parameters: [
			{
				description: "Root operator path (e.g. /project1).",
				name: "parentPath",
				required: true,
				type: "string",
			},
			{
				description: "Glob pattern to filter node names (default '*').",
				name: "pattern",
				required: false,
				type: "string",
			},
			{
				description:
					"Include expensive property blobs when you truly need them.",
				name: "includeProperties",
				required: false,
				type: "boolean",
			},
			{
				description: "Formatter verbosity for the returned list.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Optional cap on how many nodes to return.",
				name: "limit",
				required: false,
				type: "number",
			},
			{
				description: "Structured export for writing to disk.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns:
			"Set of nodes (id, opType, name, path, optional properties) under parentPath.",
		tool: TOOL_NAMES.GET_TD_NODES,
	},
	{
		category: "nodes",
		description: "Inspect an individual node with formatter-aware output",
		example: `import { getTdNodeParameters } from './servers/touchdesigner/getTdNodeParameters';

const node = await getTdNodeParameters({ nodePath: '/project1/text1' });
console.log(node.properties?.Text);`,
		functionName: "getTdNodeParameters",
		modulePath: `${MODULE_ROOT}/getTdNodeParameters.ts`,
		parameters: [
			{
				description: "Absolute path to the operator (e.g. /project1/text1).",
				name: "nodePath",
				required: true,
				type: "string",
			},
			{
				description: "Controls how many parameters and properties are shown.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Trim parameter listings to the first N entries.",
				name: "limit",
				required: false,
				type: "number",
			},
			{
				description: "Switch between machine vs human friendly layouts.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns: "Full node record with parameters, paths, and metadata.",
		tool: TOOL_NAMES.GET_TD_NODE_PARAMETERS,
	},
	{
		category: "nodes",
		description: "Create an operator under a parent path",
		example: `import { createTdNode } from './servers/touchdesigner/createTdNode';

const created = await createTdNode({
  parentPath: '/project1',
  nodeType: 'textTOP',
  nodeName: 'title',
});
console.log(created.result?.path);`,
		functionName: "createTdNode",
		modulePath: `${MODULE_ROOT}/createTdNode.ts`,
		parameters: [
			{
				description: "Where the new node should be created.",
				name: "parentPath",
				required: true,
				type: "string",
			},
			{
				description: "OP type (e.g. textTOP, constantCHOP).",
				name: "nodeType",
				required: true,
				type: "string",
			},
			{
				description:
					"Optional custom name. When omitted TouchDesigner assigns one.",
				name: "nodeName",
				required: false,
				type: "string",
			},
			{
				description: "Formatter verbosity for the creation result.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Switch result serialization to JSON for scripts.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns: "Created node metadata including resolved path and properties.",
		tool: TOOL_NAMES.CREATE_TD_NODE,
	},
	{
		category: "nodes",
		description: "Patch node properties in bulk",
		example: `import { updateTdNodeParameters } from './servers/touchdesigner/updateTdNodeParameters';

await updateTdNodeParameters({
  nodePath: '/project1/text1',
  properties: { text: 'Hello TouchDesigner' },
});`,
		functionName: "updateTdNodeParameters",
		modulePath: `${MODULE_ROOT}/updateTdNodeParameters.ts`,
		parameters: [
			{
				description: "Target operator path.",
				name: "nodePath",
				required: true,
				type: "string",
			},
			{
				description: "Key/value pairs to update on the node.",
				name: "properties",
				required: true,
				type: "Record<string, unknown>",
			},
			{
				description: "Controls how many updated keys are echoed back.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Choose JSON when writing audit logs to disk.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns:
			"Lists of updated vs failed parameters so the agent can retry selectively.",
		tool: TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS,
	},
	{
		category: "nodes",
		description: "Remove an operator safely",
		example: `import { deleteTdNode } from './servers/touchdesigner/deleteTdNode';

const result = await deleteTdNode({ nodePath: '/project1/tmp1' });
console.log(result.deleted);`,
		functionName: "deleteTdNode",
		modulePath: `${MODULE_ROOT}/deleteTdNode.ts`,
		parameters: [
			{
				description: "Absolute path of the operator to delete.",
				name: "nodePath",
				required: true,
				type: "string",
			},
			{
				description: "Sends only boolean flags when set to minimal.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Structured payload when you need audit logs.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns: "Deletion status plus previous node metadata when available.",
		tool: TOOL_NAMES.DELETE_TD_NODE,
	},
	{
		category: "nodes",
		description: "Call TouchDesigner node methods directly",
		example: `import { execNodeMethod } from './servers/touchdesigner/execNodeMethod';

const renderStatus = await execNodeMethod({
  nodePath: '/project1/render1',
  method: 'par',
  kwargs: { enable: true },
});
console.log(renderStatus.result);`,
		functionName: "execNodeMethod",
		modulePath: `${MODULE_ROOT}/execNodeMethod.ts`,
		parameters: [
			{
				description: "OP to target.",
				name: "nodePath",
				required: true,
				type: "string",
			},
			{
				description: "Name of the method to call on that operator.",
				name: "method",
				required: true,
				type: "string",
			},
			{
				description: "Positional arguments forwarded to the TouchDesigner API.",
				name: "args",
				required: false,
				type: "Array<string | number | boolean>",
			},
			{
				description: "Keyword arguments for the method call.",
				name: "kwargs",
				required: false,
				type: "Record<string, unknown>",
			},
			{
				description: "How much of the result payload to echo back.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Switch to JSON when storing method responses.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns: "Raw method return payload including any serializable values.",
		tool: TOOL_NAMES.EXECUTE_NODE_METHOD,
	},
	{
		category: "classes",
		description: "List TouchDesigner Python classes/modules",
		example: `import { getTdClasses } from './servers/touchdesigner/getTdClasses';

const classes = await getTdClasses({ limit: 20 });
console.log(classes.classes?.map(cls => cls.name));`,
		functionName: "getTdClasses",
		modulePath: `${MODULE_ROOT}/getTdClasses.ts`,
		parameters: [
			{
				description:
					"Minimal returns only names, summary adds short descriptions.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Restrict the number of classes returned to save tokens.",
				name: "limit",
				required: false,
				type: "number",
			},
			{
				description: "Return the catalog as JSON when writing caches.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns:
			"Python class catalogue with names, types, and optional summaries.",
		tool: TOOL_NAMES.GET_TD_CLASSES,
	},
	{
		category: "classes",
		description: "Fetch detailed docs for a TouchDesigner class or module",
		example: `import { getTdClassDetails } from './servers/touchdesigner/getTdClassDetails';

const textTop = await getTdClassDetails({ className: 'textTOP' });
console.log(textTop.methods?.length);`,
		functionName: "getTdClassDetails",
		modulePath: `${MODULE_ROOT}/getTdClassDetails.ts`,
		parameters: [
			{
				description: "Class/module name like textTOP or CHOP.",
				name: "className",
				required: true,
				type: "string",
			},
			{
				description: "Switch to detailed when generating docs.",
				name: "detailLevel",
				required: false,
				type: "'minimal' | 'summary' | 'detailed'",
			},
			{
				description: "Cap how many methods/properties are surfaced.",
				name: "limit",
				required: false,
				type: "number",
			},
			{
				description: "Emit YAML or JSON for caching results to disk.",
				name: "responseFormat",
				required: false,
				type: "'json' | 'yaml' | 'markdown'",
			},
		],
		returns:
			"Deep description of a Python class including methods and properties.",
		tool: TOOL_NAMES.GET_TD_CLASS_DETAILS,
	},
];

export function getTouchDesignerToolMetadata(): ToolMetadata[] {
	return TOUCH_DESIGNER_TOOL_METADATA;
}

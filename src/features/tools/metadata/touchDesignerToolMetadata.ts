import { TOOL_NAMES } from "../../../core/constants.js";
import type { ToolNames } from "../index.js";

export type ToolCategory =
	| "system"
	| "python"
	| "nodes"
	| "classes"
	| "state";

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
		tool: TOOL_NAMES.GET_TD_INFO,
		modulePath: `${MODULE_ROOT}/getTdInfo.ts`,
		functionName: "getTdInfo",
		description: "Get server information from TouchDesigner",
		category: "system",
		parameters: [
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "Optional presenter granularity for formatted output.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Overrides the formatter output format for automation.",
			},
		],
		returns: "TouchDesigner build metadata (server, version, operating system).",
		example: `import { getTdInfo } from './servers/touchdesigner/getTdInfo';

const info = await getTdInfo();
console.log(\`\${info.server} \${info.version}\`);`,
	},
	{
		tool: TOOL_NAMES.EXECUTE_PYTHON_SCRIPT,
		modulePath: `${MODULE_ROOT}/executePythonScript.ts`,
		functionName: "executePythonScript",
		description: "Execute arbitrary Python against the TouchDesigner session",
		category: "python",
		parameters: [
			{
				name: "script",
				type: "string",
				required: true,
				description:
					"Python source that TouchDesigner will eval. Multiline scripts supported.",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description:
					"Choose how much of the execution metadata to surface back to the agent.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Structured response encoding for downstream tooling.",
			},
		],
		returns:
			"Result payload that mirrors `result` from the executed script (if set).",
		example: `import { executePythonScript } from './servers/touchdesigner/executePythonScript';

await executePythonScript({
  script: "op('/project1/text1').par.text = 'Hello MCP'",
});`,
		notes:
			"Wrap long-running scripts with logging so the agent can stream intermediate checkpoints.",
	},
	{
		tool: TOOL_NAMES.GET_TD_NODES,
		modulePath: `${MODULE_ROOT}/getTdNodes.ts`,
		functionName: "getTdNodes",
		description: "List nodes below a parent path",
		category: "nodes",
		parameters: [
			{
				name: "parentPath",
				type: "string",
				required: true,
				description: "Root operator path (e.g. /project1).",
			},
			{
				name: "pattern",
				type: "string",
				required: false,
				description: "Glob pattern to filter node names (default '*').",
			},
			{
				name: "includeProperties",
				type: "boolean",
				required: false,
				description:
					"Include expensive property blobs when you truly need them.",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "Formatter verbosity for the returned list.",
			},
			{
				name: "limit",
				type: "number",
				required: false,
				description: "Optional cap on how many nodes to return.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Structured export for writing to disk.",
			},
		],
		returns:
			"Set of nodes (id, opType, name, path, optional properties) under parentPath.",
		example: `import { getTdNodes } from './servers/touchdesigner/getTdNodes';

const nodes = await getTdNodes({
  parentPath: '/project1',
  pattern: 'geo*',
});
console.log(nodes.nodes?.map(node => node.path));`,
	},
	{
		tool: TOOL_NAMES.GET_TD_NODE_PARAMETERS,
		modulePath: `${MODULE_ROOT}/getTdNodeParameters.ts`,
		functionName: "getTdNodeParameters",
		description: "Inspect an individual node with formatter-aware output",
		category: "nodes",
		parameters: [
			{
				name: "nodePath",
				type: "string",
				required: true,
				description: "Absolute path to the operator (e.g. /project1/text1).",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "Controls how many parameters and properties are shown.",
			},
			{
				name: "limit",
				type: "number",
				required: false,
				description: "Trim parameter listings to the first N entries.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Switch between machine vs human friendly layouts.",
			},
		],
		returns: "Full node record with parameters, paths, and metadata.",
		example: `import { getTdNodeParameters } from './servers/touchdesigner/getTdNodeParameters';

const node = await getTdNodeParameters({ nodePath: '/project1/text1' });
console.log(node.properties?.Text);`,
	},
	{
		tool: TOOL_NAMES.CREATE_TD_NODE,
		modulePath: `${MODULE_ROOT}/createTdNode.ts`,
		functionName: "createTdNode",
		description: "Create an operator under a parent path",
		category: "nodes",
		parameters: [
			{
				name: "parentPath",
				type: "string",
				required: true,
				description: "Where the new node should be created.",
			},
			{
				name: "nodeType",
				type: "string",
				required: true,
				description: "OP type (e.g. textTOP, constantCHOP).",
			},
			{
				name: "nodeName",
				type: "string",
				required: false,
				description:
					"Optional custom name. When omitted TouchDesigner assigns one.",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "Formatter verbosity for the creation result.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Switch result serialization to JSON for scripts.",
			},
		],
		returns: "Created node metadata including resolved path and properties.",
		example: `import { createTdNode } from './servers/touchdesigner/createTdNode';

const created = await createTdNode({
  parentPath: '/project1',
  nodeType: 'textTOP',
  nodeName: 'title',
});
console.log(created.result?.path);`,
	},
	{
		tool: TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS,
		modulePath: `${MODULE_ROOT}/updateTdNodeParameters.ts`,
		functionName: "updateTdNodeParameters",
		description: "Patch node properties in bulk",
		category: "nodes",
		parameters: [
			{
				name: "nodePath",
				type: "string",
				required: true,
				description: "Target operator path.",
			},
			{
				name: "properties",
				type: "Record<string, unknown>",
				required: true,
				description: "Key/value pairs to update on the node.",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "Controls how many updated keys are echoed back.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Choose JSON when writing audit logs to disk.",
			},
		],
		returns:
			"Lists of updated vs failed parameters so the agent can retry selectively.",
		example: `import { updateTdNodeParameters } from './servers/touchdesigner/updateTdNodeParameters';

await updateTdNodeParameters({
  nodePath: '/project1/text1',
  properties: { text: 'Hello TouchDesigner' },
});`,
	},
	{
		tool: TOOL_NAMES.DELETE_TD_NODE,
		modulePath: `${MODULE_ROOT}/deleteTdNode.ts`,
		functionName: "deleteTdNode",
		description: "Remove an operator safely",
		category: "nodes",
		parameters: [
			{
				name: "nodePath",
				type: "string",
				required: true,
				description: "Absolute path of the operator to delete.",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "Sends only boolean flags when set to minimal.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Structured payload when you need audit logs.",
			},
		],
		returns: "Deletion status plus previous node metadata when available.",
		example: `import { deleteTdNode } from './servers/touchdesigner/deleteTdNode';

const result = await deleteTdNode({ nodePath: '/project1/tmp1' });
console.log(result.deleted);`,
	},
	{
		tool: TOOL_NAMES.EXECUTE_NODE_METHOD,
		modulePath: `${MODULE_ROOT}/execNodeMethod.ts`,
		functionName: "execNodeMethod",
		description: "Call TouchDesigner node methods directly",
		category: "nodes",
		parameters: [
			{
				name: "nodePath",
				type: "string",
				required: true,
				description: "OP to target.",
			},
			{
				name: "method",
				type: "string",
				required: true,
				description: "Name of the method to call on that operator.",
			},
			{
				name: "args",
				type: "Array<string | number | boolean>",
				required: false,
				description: "Positional arguments forwarded to the TouchDesigner API.",
			},
			{
				name: "kwargs",
				type: "Record<string, unknown>",
				required: false,
				description: "Keyword arguments for the method call.",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "How much of the result payload to echo back.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Switch to JSON when storing method responses.",
			},
		],
		returns: "Raw method return payload including any serializable values.",
		example: `import { execNodeMethod } from './servers/touchdesigner/execNodeMethod';

const renderStatus = await execNodeMethod({
  nodePath: '/project1/render1',
  method: 'par',
  kwargs: { enable: true },
});
console.log(renderStatus.result);`,
	},
	{
		tool: TOOL_NAMES.GET_TD_CLASSES,
		modulePath: `${MODULE_ROOT}/getTdClasses.ts`,
		functionName: "getTdClasses",
		description: "List TouchDesigner Python classes/modules",
		category: "classes",
		parameters: [
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description:
					"Minimal returns only names, summary adds short descriptions.",
			},
			{
				name: "limit",
				type: "number",
				required: false,
				description: "Restrict the number of classes returned to save tokens.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Return the catalog as JSON when writing caches.",
			},
		],
		returns: "Python class catalogue with names, types, and optional summaries.",
		example: `import { getTdClasses } from './servers/touchdesigner/getTdClasses';

const classes = await getTdClasses({ limit: 20 });
console.log(classes.classes?.map(cls => cls.name));`,
	},
	{
		tool: TOOL_NAMES.GET_TD_CLASS_DETAILS,
		modulePath: `${MODULE_ROOT}/getTdClassDetails.ts`,
		functionName: "getTdClassDetails",
		description: "Fetch detailed docs for a TouchDesigner class or module",
		category: "classes",
		parameters: [
			{
				name: "className",
				type: "string",
				required: true,
				description: "Class/module name like textTOP or CHOP.",
			},
			{
				name: "detailLevel",
				type: "'minimal' | 'summary' | 'detailed'",
				required: false,
				description: "Switch to detailed when generating docs.",
			},
			{
				name: "limit",
				type: "number",
				required: false,
				description: "Cap how many methods/properties are surfaced.",
			},
			{
				name: "responseFormat",
				type: "'json' | 'yaml' | 'markdown'",
				required: false,
				description: "Emit YAML or JSON for caching results to disk.",
			},
		],
		returns:
			"Deep description of a Python class including methods and properties.",
		example: `import { getTdClassDetails } from './servers/touchdesigner/getTdClassDetails';

const textTop = await getTdClassDetails({ className: 'textTOP' });
console.log(textTop.methods?.length);`,
	},
];

export function getTouchDesignerToolMetadata(): ToolMetadata[] {
	return TOUCH_DESIGNER_TOOL_METADATA;
}

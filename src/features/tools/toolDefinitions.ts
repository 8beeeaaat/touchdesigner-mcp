import type { z } from "zod";
import { REFERENCE_COMMENT, TOOL_NAMES } from "../../core/constants.js";
import type { ILogger } from "../../core/logger.js";
import {
	CreateNodeBody,
	DeleteNodeQueryParams,
	ExecNodeMethodBody,
	ExecPythonScriptBody,
	GetModuleHelpQueryParams,
	GetNodeDetailQueryParams,
	GetNodeErrorsQueryParams,
	GetNodesQueryParams,
	GetTdPythonClassDetailsParams,
	UpdateNodeBody,
} from "../../gen/mcp/touchDesignerAPI.zod.js";
import type { TouchDesignerClient } from "../../tdClient/touchDesignerClient.js";
import type { ToolNames } from "./index.js";
import {
	formatClassDetails,
	formatClassList,
	formatCreateNodeResult,
	formatDeleteNodeResult,
	formatExecNodeMethodResult,
	formatModuleHelp,
	formatNodeDetails,
	formatNodeErrors,
	formatNodeList,
	formatScriptResult,
	formatTdInfo,
	formatUpdateNodeResult,
} from "./presenter/index.js";
import {
	detailOnlyFormattingSchema,
	formattingOptionsSchema,
} from "./types.js";

export type ToolCategory = "system" | "python" | "nodes" | "classes" | "state";

/**
 * Single source of truth for a TouchDesigner MCP tool.
 *
 * Both the MCP registration loop (`registerTdTools`) and the
 * `describe_td_tools` manifest (`buildToolMetadata`) are derived from this
 * table, so a tool's description and input parameters can never drift between
 * what is registered and what is documented. Parameter metadata is introspected
 * directly from `schema`, which itself originates from the OpenAPI spec.
 */
export interface ToolDefinition {
	/** Registered MCP tool name (also the source for functionName/modulePath). */
	name: ToolNames;
	/** Agent-facing description, used for both registration and the manifest. */
	description: string;
	category: ToolCategory;
	/** Composed Zod schema: OpenAPI-derived params extended with formatting flags. */
	schema: z.ZodObject<z.ZodRawShape>;
	/** Human summary of the return payload (manifest only). */
	returns: string;
	/** Usage example shown in the detailed manifest view (manifest only). */
	example: string;
	notes?: string;
	/** Optional reference comment appended to error output. */
	errorComment?: string;
	/** Executes the tool and returns formatter-ready text. */
	run: (ctx: ToolRunContext) => Promise<string>;
}

export interface ToolRunContext {
	params: Record<string, unknown>;
	tdClient: TouchDesignerClient;
	logger: ILogger;
}

type TypedRunContext<S extends z.ZodObject<z.ZodRawShape>> = {
	params: z.infer<S>;
	tdClient: TouchDesignerClient;
	logger: ILogger;
};

/**
 * Authoring helper that infers `params` from the tool's schema while erasing to
 * the uniform {@link ToolDefinition} shape for storage in the table.
 */
function defineTool<S extends z.ZodObject<z.ZodRawShape>>(def: {
	name: ToolNames;
	description: string;
	category: ToolCategory;
	schema: S;
	returns: string;
	example: string;
	notes?: string;
	errorComment?: string;
	run: (ctx: TypedRunContext<S>) => Promise<string>;
}): ToolDefinition {
	// `run` has a narrower param type (z.infer<S>) than ToolDefinition exposes
	// (Record<string, unknown>). Function parameters are contravariant, so a
	// direct `as ToolDefinition` is rejected; the double cast is required. Safe
	// because params are validated by the MCP SDK before reaching run().
	return def as unknown as ToolDefinition;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
	defineTool({
		category: "system",
		description: "Get server information from TouchDesigner",
		example: `import { getTdInfo } from './servers/touchdesigner/getTdInfo';

const info = await getTdInfo();
console.log(\`\${info.server} \${info.version}\`);`,
		name: TOOL_NAMES.GET_TD_INFO,
		returns:
			"TouchDesigner build metadata (server, version, operating system).",
		run: async ({ params, tdClient }) => {
			const result = await tdClient.getTdInfo();
			if (!result.success) {
				throw result.error;
			}
			return formatTdInfo(result.data, {
				detailLevel: params.detailLevel ?? "summary",
				responseFormat: params.responseFormat,
			});
		},
		schema: detailOnlyFormattingSchema,
	}),
	defineTool({
		category: "python",
		description:
			"Execute a Python script in TouchDesigner (detailLevel=minimal|summary|detailed, responseFormat=json|yaml|markdown)",
		example: `import { executePythonScript } from './servers/touchdesigner/executePythonScript';

await executePythonScript({
  script: "op('/project1/text1').par.text = 'Hello MCP'",
});`,
		name: TOOL_NAMES.EXECUTE_PYTHON_SCRIPT,
		notes:
			"Wrap long-running scripts with logging so the agent can stream intermediate checkpoints.",
		returns:
			"Result payload that mirrors `result` from the executed script (if set).",
		run: async ({ params, tdClient, logger }) => {
			const { detailLevel, responseFormat, ...scriptParams } = params;
			logger.sendLog({
				data: `Executing script: ${scriptParams.script}`,
				level: "debug",
			});
			const result = await tdClient.execPythonScript(scriptParams);
			if (!result.success) {
				throw result.error;
			}
			return formatScriptResult(result, scriptParams.script, {
				detailLevel: detailLevel ?? "summary",
				responseFormat,
			});
		},
		schema: ExecPythonScriptBody.extend(detailOnlyFormattingSchema.shape),
	}),
	defineTool({
		category: "nodes",
		description:
			"List nodes under a path with token-optimized output (detailLevel+limit supported)",
		errorComment: REFERENCE_COMMENT,
		example: `import { getTdNodes } from './servers/touchdesigner/getTdNodes';

const nodes = await getTdNodes({
  parentPath: '/project1',
  pattern: 'geo*',
});
console.log(nodes.nodes?.map(node => node.path));`,
		name: TOOL_NAMES.GET_TD_NODES,
		returns:
			"Set of nodes (id, opType, name, path, optional properties) under parentPath.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, limit, responseFormat, ...queryParams } = params;
			const result = await tdClient.getNodes(queryParams);
			if (!result.success) {
				throw result.error;
			}
			const fallbackMode = queryParams.includeProperties
				? "detailed"
				: "summary";
			return formatNodeList(result.data, {
				detailLevel: detailLevel ?? fallbackMode,
				limit,
				responseFormat,
			});
		},
		schema: GetNodesQueryParams.extend(formattingOptionsSchema.shape),
	}),
	defineTool({
		category: "nodes",
		description:
			"Get node parameters with concise/detailed formatting (detailLevel+limit supported)",
		errorComment: REFERENCE_COMMENT,
		example: `import { getTdNodeParameters } from './servers/touchdesigner/getTdNodeParameters';

const node = await getTdNodeParameters({ nodePath: '/project1/text1' });
console.log(node.properties?.Text);`,
		name: TOOL_NAMES.GET_TD_NODE_PARAMETERS,
		returns: "Full node record with parameters, paths, and metadata.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, limit, responseFormat, ...queryParams } = params;
			const result = await tdClient.getNodeDetail(queryParams);
			if (!result.success) {
				throw result.error;
			}
			return formatNodeDetails(result.data, {
				detailLevel: detailLevel ?? "summary",
				limit,
				responseFormat,
			});
		},
		schema: GetNodeDetailQueryParams.extend(formattingOptionsSchema.shape),
	}),
	defineTool({
		category: "nodes",
		description: "Check node and descendant errors reported by TouchDesigner",
		errorComment: REFERENCE_COMMENT,
		example: `import { getTdNodeErrors } from './servers/touchdesigner/getTdNodeErrors';

const report = await getTdNodeErrors({
  nodePath: '/project1/text1',
});
if (report.hasErrors) {
  console.log(report.errors?.map(err => err.message));
}`,
		name: TOOL_NAMES.GET_TD_NODE_ERRORS,
		returns: "Error report outlining offending nodes, messages, and counts.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, limit, responseFormat, ...queryParams } = params;
			const result = await tdClient.getNodeErrors(queryParams);
			if (!result.success) {
				throw result.error;
			}
			return formatNodeErrors(result.data, {
				detailLevel: detailLevel ?? "summary",
				limit,
				responseFormat,
			});
		},
		schema: GetNodeErrorsQueryParams.extend(formattingOptionsSchema.shape),
	}),
	defineTool({
		category: "nodes",
		description: "Create a new node in TouchDesigner",
		errorComment: REFERENCE_COMMENT,
		example: `import { createTdNode } from './servers/touchdesigner/createTdNode';

const created = await createTdNode({
  parentPath: '/project1',
  nodeType: 'textTOP',
  nodeName: 'title',
});
console.log(created.result?.path);`,
		name: TOOL_NAMES.CREATE_TD_NODE,
		returns: "Created node metadata including resolved path and properties.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, responseFormat, ...createParams } = params;
			const result = await tdClient.createNode(createParams);
			if (!result.success) {
				throw result.error;
			}
			return formatCreateNodeResult(result.data, {
				detailLevel: detailLevel ?? "summary",
				responseFormat,
			});
		},
		schema: CreateNodeBody.extend(detailOnlyFormattingSchema.shape),
	}),
	defineTool({
		category: "nodes",
		description: "Update parameters of a specific node in TouchDesigner",
		errorComment: REFERENCE_COMMENT,
		example: `import { updateTdNodeParameters } from './servers/touchdesigner/updateTdNodeParameters';

await updateTdNodeParameters({
  nodePath: '/project1/text1',
  properties: { text: 'Hello TouchDesigner' },
});`,
		name: TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS,
		returns:
			"Lists of updated vs failed parameters so the agent can retry selectively.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, responseFormat, ...updateParams } = params;
			const result = await tdClient.updateNode(updateParams);
			if (!result.success) {
				throw result.error;
			}
			return formatUpdateNodeResult(result.data, {
				detailLevel: detailLevel ?? "summary",
				responseFormat,
			});
		},
		schema: UpdateNodeBody.extend(detailOnlyFormattingSchema.shape),
	}),
	defineTool({
		category: "nodes",
		description: "Delete an existing node in TouchDesigner",
		errorComment: REFERENCE_COMMENT,
		example: `import { deleteTdNode } from './servers/touchdesigner/deleteTdNode';

const result = await deleteTdNode({ nodePath: '/project1/tmp1' });
console.log(result.deleted);`,
		name: TOOL_NAMES.DELETE_TD_NODE,
		returns: "Deletion status plus previous node metadata when available.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, responseFormat, ...deleteParams } = params;
			const result = await tdClient.deleteNode(deleteParams);
			if (!result.success) {
				throw result.error;
			}
			return formatDeleteNodeResult(result.data, {
				detailLevel: detailLevel ?? "summary",
				responseFormat,
			});
		},
		schema: DeleteNodeQueryParams.extend(detailOnlyFormattingSchema.shape),
	}),
	defineTool({
		category: "nodes",
		description: "Execute a method on a specific node in TouchDesigner",
		errorComment: REFERENCE_COMMENT,
		example: `import { execNodeMethod } from './servers/touchdesigner/execNodeMethod';

const renderStatus = await execNodeMethod({
  nodePath: '/project1/render1',
  method: 'par',
  kwargs: { enable: true },
});
console.log(renderStatus.result);`,
		name: TOOL_NAMES.EXECUTE_NODE_METHOD,
		returns: "Raw method return payload including any serializable values.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, responseFormat, ...execParams } = params;
			const { nodePath, method, args, kwargs } = execParams;
			const result = await tdClient.execNodeMethod(execParams);
			if (!result.success) {
				throw result.error;
			}
			return formatExecNodeMethodResult(
				result.data,
				{ args, kwargs, method, nodePath },
				{ detailLevel: detailLevel ?? "summary", responseFormat },
			);
		},
		schema: ExecNodeMethodBody.extend(detailOnlyFormattingSchema.shape),
	}),
	defineTool({
		category: "classes",
		description:
			"List TouchDesigner Python classes/modules (detailLevel+limit supported)",
		errorComment: REFERENCE_COMMENT,
		example: `import { getTdClasses } from './servers/touchdesigner/getTdClasses';

const classes = await getTdClasses({ limit: 20 });
console.log(classes.classes?.map(cls => cls.name));`,
		name: TOOL_NAMES.GET_TD_CLASSES,
		returns:
			"Python class catalogue with names, types, and optional summaries.",
		run: async ({ params, tdClient }) => {
			const result = await tdClient.getClasses();
			if (!result.success) {
				throw result.error;
			}
			return formatClassList(result.data, {
				detailLevel: params.detailLevel ?? "summary",
				limit: params.limit ?? 50,
				responseFormat: params.responseFormat,
			});
		},
		schema: formattingOptionsSchema,
	}),
	defineTool({
		category: "classes",
		description:
			"Get information about a TouchDesigner class/module (detailLevel+limit supported)",
		errorComment: REFERENCE_COMMENT,
		example: `import { getTdClassDetails } from './servers/touchdesigner/getTdClassDetails';

const textTop = await getTdClassDetails({ className: 'textTOP' });
console.log(textTop.methods?.length);`,
		name: TOOL_NAMES.GET_TD_CLASS_DETAILS,
		returns:
			"Deep description of a Python class including methods and properties.",
		run: async ({ params, tdClient }) => {
			const { className, detailLevel, limit, responseFormat } = params;
			const result = await tdClient.getClassDetails(className);
			if (!result.success) {
				throw result.error;
			}
			return formatClassDetails(result.data, {
				detailLevel: detailLevel ?? "summary",
				limit: limit ?? 30,
				responseFormat,
			});
		},
		schema: GetTdPythonClassDetailsParams.extend(formattingOptionsSchema.shape),
	}),
	defineTool({
		category: "classes",
		description:
			"Retrieve Python help() text for a TouchDesigner module or class",
		example: `import { getTdModuleHelp } from './servers/touchdesigner/getTdModuleHelp';

const docs = await getTdModuleHelp({ moduleName: 'noiseCHOP' });
console.log(docs.helpText?.slice(0, 200));`,
		name: TOOL_NAMES.GET_TD_MODULE_HELP,
		returns: "Captured Python help() output with formatter context.",
		run: async ({ params, tdClient }) => {
			const { detailLevel, moduleName, responseFormat } = params;
			const result = await tdClient.getModuleHelp({ moduleName });
			if (!result.success) {
				throw result.error;
			}
			return formatModuleHelp(result.data, {
				detailLevel: detailLevel ?? "summary",
				responseFormat,
			});
		},
		schema: GetModuleHelpQueryParams.extend(detailOnlyFormattingSchema.shape),
	}),
];

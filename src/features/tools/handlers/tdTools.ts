import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResultSchema } from "node_modules/@modelcontextprotocol/sdk/dist/esm/types.js";
import { z } from "zod";
import { REFERENCE_COMMENT, TOOL_NAMES } from "../../../core/constants.js";
import { handleToolError } from "../../../core/errorHandling.js";
import type { ILogger } from "../../../core/logger.js";
import {
	createNodeBody,
	deleteNodeQueryParams,
	execNodeMethodBody,
	execPythonScriptBody,
	getModuleHelpQueryParams,
	getNodeDetailQueryParams,
	getNodeErrorsQueryParams,
	getNodesQueryParams,
	getTdPythonClassDetailsParams,
	updateNodeBody,
} from "../../../gen/mcp/touchDesignerAPI.zod.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";
import type { ToolMetadata } from "../metadata/touchDesignerToolMetadata.js";
import { getTouchDesignerToolMetadata } from "../metadata/touchDesignerToolMetadata.js";
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
	formatToolMetadata,
	formatUpdateNodeResult,
} from "../presenter/index.js";
import {
	detailOnlyFormattingSchema,
	type FormattingOptionsParams,
	formattingOptionsSchema,
} from "../types.js";

const execPythonScriptToolSchema = execPythonScriptBody.extend(
	detailOnlyFormattingSchema.shape,
);
type ExecPythonScriptToolParams = z.input<typeof execPythonScriptToolSchema>;

const tdInfoToolSchema = detailOnlyFormattingSchema;
type TdInfoToolParams = z.input<typeof tdInfoToolSchema>;

const getNodesToolSchema = getNodesQueryParams.extend(
	formattingOptionsSchema.shape,
);
type GetNodesToolParams = z.input<typeof getNodesToolSchema>;

const getNodeDetailToolSchema = getNodeDetailQueryParams.extend(
	formattingOptionsSchema.shape,
);
type GetNodeDetailToolParams = z.input<typeof getNodeDetailToolSchema>;

const getNodeErrorsToolSchema = getNodeErrorsQueryParams.extend(
	formattingOptionsSchema.shape,
);
type GetNodeErrorsToolParams = z.input<typeof getNodeErrorsToolSchema>;

const createNodeToolSchema = createNodeBody.extend(
	detailOnlyFormattingSchema.shape,
);
type CreateNodeToolParams = z.input<typeof createNodeToolSchema>;

const updateNodeToolSchema = updateNodeBody.extend(
	detailOnlyFormattingSchema.shape,
);
type UpdateNodeToolParams = z.input<typeof updateNodeToolSchema>;

const deleteNodeToolSchema = deleteNodeQueryParams.extend(
	detailOnlyFormattingSchema.shape,
);
type DeleteNodeToolParams = z.input<typeof deleteNodeToolSchema>;

const classListToolSchema = formattingOptionsSchema;
type ClassListToolParams = FormattingOptionsParams;

const classDetailToolSchema = getTdPythonClassDetailsParams.extend(
	formattingOptionsSchema.shape,
);
type ClassDetailToolParams = z.input<typeof classDetailToolSchema>;

const moduleHelpToolSchema = getModuleHelpQueryParams.extend(
	detailOnlyFormattingSchema.shape,
);
type ModuleHelpToolParams = z.input<typeof moduleHelpToolSchema>;

const execNodeMethodToolSchema = execNodeMethodBody.extend(
	detailOnlyFormattingSchema.shape,
);
type ExecNodeMethodToolParams = z.input<typeof execNodeMethodToolSchema>;

const describeToolsSchema = detailOnlyFormattingSchema.extend({
	filter: z
		.string()
		.min(1)
		.describe(
			"Optional keyword to filter by tool name, module path, or parameter description",
		)
		.optional(),
});
type DescribeToolsParams = z.input<typeof describeToolsSchema>;

export function registerTdTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
): void {
	const toolMetadataEntries = getTouchDesignerToolMetadata();

	server.tool(
		TOOL_NAMES.DESCRIBE_TD_TOOLS,
		"Generate a filesystem-oriented manifest of available TouchDesigner tools",
		describeToolsSchema.strict().shape,
		async (params: DescribeToolsParams = {}) => {
			try {
				const { detailLevel, responseFormat, filter } = params;
				const normalizedFilter = filter?.trim().toLowerCase();
				const filteredEntries = normalizedFilter
					? toolMetadataEntries.filter((entry) =>
							matchesMetadataFilter(entry, normalizedFilter),
						)
					: toolMetadataEntries;

				if (filteredEntries.length === 0) {
					const message = filter
						? `No TouchDesigner tools matched filter "${filter}".`
						: "No TouchDesigner tools are registered.";
					return {
						content: [
							{
								text: message,
								type: "text" as const,
							},
						],
					};
				}

				const formattedText = formatToolMetadata(filteredEntries, {
					detailLevel: detailLevel ?? (filter ? "summary" : "minimal"),
					filter: normalizedFilter,
					responseFormat,
				});

				return {
					content: [
						{
							text: formattedText,
							type: "text" as const,
						},
					],
				};
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.DESCRIBE_TD_TOOLS);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TD_INFO,
		"Get server information from TouchDesigner",
		tdInfoToolSchema.strict().shape,
		async (params: TdInfoToolParams = {}) => {
			try {
				const { detailLevel, responseFormat } = params;
				const result = await tdClient.getTdInfo();
				if (!result.success) {
					throw result.error;
				}
				const formattedText = formatTdInfo(result.data, {
					detailLevel: detailLevel ?? "summary",
					responseFormat,
				});
				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.GET_TD_INFO);
			}
		},
	);

	server.tool(
		TOOL_NAMES.EXECUTE_PYTHON_SCRIPT,
		"Execute a Python script in TouchDesigner (detailLevel=minimal|summary|detailed, responseFormat=json|yaml|markdown)",
		execPythonScriptToolSchema.strict().shape,
		async (params: ExecPythonScriptToolParams) => {
			try {
				const { detailLevel, responseFormat, ...scriptParams } = params;
				logger.sendLog({
					data: `Executing script: ${scriptParams.script}`,
					level: "debug",
				});

				const result = await tdClient.execPythonScript(scriptParams);
				if (!result.success) {
					throw result.error;
				}

				// Use formatter for token-optimized response
				const formattedText = formatScriptResult(result, scriptParams.script, {
					detailLevel: detailLevel ?? "summary",
					responseFormat,
				});

				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.EXECUTE_PYTHON_SCRIPT);
			}
		},
	);
	server.tool(
		TOOL_NAMES.CREATE_TD_NODE,
		"Create a new node in TouchDesigner",
		createNodeToolSchema.strict().shape,
		async (params: CreateNodeToolParams) => {
			try {
				const { detailLevel, responseFormat, ...createParams } = params;

				const result = await tdClient.createNode(createParams);
				if (!result.success) {
					throw result.error;
				}
				const formattedText = formatCreateNodeResult(result.data, {
					detailLevel: detailLevel ?? "summary",
					responseFormat,
				});
				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.CREATE_TD_NODE,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.DELETE_TD_NODE,
		"Delete an existing node in TouchDesigner",
		deleteNodeToolSchema.strict().shape,
		async (params: DeleteNodeToolParams) => {
			try {
				const { detailLevel, responseFormat, ...deleteParams } = params;
				const result = await tdClient.deleteNode(deleteParams);
				if (!result.success) {
					throw result.error;
				}
				const formattedText = formatDeleteNodeResult(result.data, {
					detailLevel: detailLevel ?? "summary",
					responseFormat,
				});
				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.DELETE_TD_NODE,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TD_NODES,
		"List nodes under a path with token-optimized output (detailLevel+limit supported)",
		getNodesToolSchema.strict().shape,
		async (params: GetNodesToolParams) => {
			try {
				const { detailLevel, limit, responseFormat, ...queryParams } = params;
				const result = await tdClient.getNodes(queryParams);
				if (!result.success) {
					throw result.error;
				}

				// Use formatter for token-optimized response
				const fallbackMode = queryParams.includeProperties
					? "detailed"
					: "summary";
				const formattedText = formatNodeList(result.data, {
					detailLevel: detailLevel ?? fallbackMode,
					limit,
					responseFormat,
				});

				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.GET_TD_NODES,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TD_NODE_PARAMETERS,
		"Get node parameters with concise/detailed formatting (detailLevel+limit supported)",
		getNodeDetailToolSchema.strict().shape,
		async (params: GetNodeDetailToolParams) => {
			try {
				const { detailLevel, limit, responseFormat, ...queryParams } = params;
				const result = await tdClient.getNodeDetail(queryParams);
				if (!result.success) {
					throw result.error;
				}

				// Use formatter for token-optimized response
				const formattedText = formatNodeDetails(result.data, {
					detailLevel: detailLevel ?? "summary",
					limit,
					responseFormat,
				});

				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,

					TOOL_NAMES.GET_TD_NODE_PARAMETERS,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TD_NODE_ERRORS,
		"Check node and descendant errors reported by TouchDesigner",
		getNodeErrorsToolSchema.strict().shape,
		async (params: GetNodeErrorsToolParams) => {
			try {
				const { detailLevel, limit, responseFormat, ...queryParams } = params;
				const result = await tdClient.getNodeErrors(queryParams);
				if (!result.success) {
					throw result.error;
				}

				const formattedText = formatNodeErrors(result.data, {
					detailLevel: detailLevel ?? "summary",
					limit,
					responseFormat,
				});

				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.GET_TD_NODE_ERRORS,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS,
		"Update parameters of a specific node in TouchDesigner",
		updateNodeToolSchema.strict().shape,
		async (params: UpdateNodeToolParams) => {
			try {
				const { detailLevel, responseFormat, ...updateParams } = params;
				const result = await tdClient.updateNode(updateParams);
				if (!result.success) {
					throw result.error;
				}
				const formattedText = formatUpdateNodeResult(result.data, {
					detailLevel: detailLevel ?? "summary",
					responseFormat,
				});
				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.EXECUTE_NODE_METHOD,
		"Execute a method on a specific node in TouchDesigner",
		execNodeMethodToolSchema.strict().shape,
		async (params: ExecNodeMethodToolParams) => {
			try {
				const { detailLevel, responseFormat, ...execParams } = params;
				const { nodePath, method, args, kwargs } = execParams;

				const result = await tdClient.execNodeMethod(execParams);
				if (!result.success) {
					throw result.error;
				}
				const formattedText = formatExecNodeMethodResult(
					result.data,
					{ args, kwargs, method, nodePath },
					{ detailLevel: detailLevel ?? "summary", responseFormat },
				);
				return createToolResult(tdClient, formattedText);
			} catch (error) {
				logger.sendLog({
					data: error,
					level: "error",
				});
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.EXECUTE_NODE_METHOD,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TD_CLASSES,
		"List TouchDesigner Python classes/modules (detailLevel+limit supported)",
		classListToolSchema.strict().shape,
		async (params: ClassListToolParams = {}) => {
			try {
				const result = await tdClient.getClasses();
				if (!result.success) {
					throw result.error;
				}

				// Use formatter for token-optimized response
				const formattedText = formatClassList(result.data, {
					detailLevel: params.detailLevel ?? "summary",
					limit: params.limit ?? 50,
					responseFormat: params.responseFormat,
				});

				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.GET_TD_CLASSES,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TD_CLASS_DETAILS,
		"Get information about a TouchDesigner class/module (detailLevel+limit supported)",
		classDetailToolSchema.strict().shape,
		async (params: ClassDetailToolParams) => {
			try {
				const { className, detailLevel, limit, responseFormat } = params;
				const result = await tdClient.getClassDetails(className);
				if (!result.success) {
					throw result.error;
				}

				// Use formatter for token-optimized response
				const formattedText = formatClassDetails(result.data, {
					detailLevel: detailLevel ?? "summary",
					limit: limit ?? 30,
					responseFormat,
				});

				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(
					error,
					logger,
					TOOL_NAMES.GET_TD_CLASS_DETAILS,
					REFERENCE_COMMENT,
				);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TD_MODULE_HELP,
		"Retrieve Python help() text for a TouchDesigner module or class",
		moduleHelpToolSchema.strict().shape,
		async (params: ModuleHelpToolParams) => {
			try {
				const { detailLevel, moduleName, responseFormat } = params;
				const result = await tdClient.getModuleHelp({ moduleName });
				if (!result.success) {
					throw result.error;
				}
				const formattedText = formatModuleHelp(result.data, {
					detailLevel: detailLevel ?? "summary",
					responseFormat,
				});
				return createToolResult(tdClient, formattedText);
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.GET_TD_MODULE_HELP);
			}
		},
	);
}

const createToolResult = (
	tdClient: TouchDesignerClient,
	text: string,
): z.infer<typeof CallToolResultSchema> => {
	const content: z.infer<typeof CallToolResultSchema>["content"] = [
		{
			text,
			type: "text" as const,
		},
	];
	const additionalContents = tdClient.getAdditionalToolResultContents();
	if (additionalContents) {
		content.push(...additionalContents);
	}
	return { content };
};

function matchesMetadataFilter(entry: ToolMetadata, keyword: string): boolean {
	const normalizedKeyword = keyword.toLowerCase();
	const haystacks = [
		entry.functionName,
		entry.modulePath,
		entry.description,
		entry.category,
		entry.tool,
		entry.notes ?? "",
	];

	if (
		haystacks.some((value) => value.toLowerCase().includes(normalizedKeyword))
	) {
		return true;
	}

	return entry.parameters.some((param) =>
		[param.name, param.type, param.description ?? ""].some((value) =>
			value.toLowerCase().includes(normalizedKeyword),
		),
	);
}

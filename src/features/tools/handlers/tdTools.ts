import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { REFERENCE_COMMENT, TOOL_NAMES } from "../../../core/constants.js";
import { handleToolError } from "../../../core/errorHandling.js";
import type { ILogger } from "../../../core/logger.js";
import {
	createNodeBody,
	deleteNodeQueryParams,
	execNodeMethodBody,
	execPythonScriptBody,
	getNodeDetailQueryParams,
	getNodesQueryParams,
	getTdPythonClassDetailsParams,
	updateNodeBody,
} from "../../../gen/mcp/touchDesignerAPI.zod.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";

export function registerTdTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
): void {
	server.tool(
		TOOL_NAMES.GET_TD_INFO,
		"Get server information from TouchDesigner",
		async () => {
			try {
				const result = await tdClient.getTdInfo();
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `Server information: ${JSON.stringify(result, null, 2)}`,
						},
					],
				};
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.GET_TD_INFO);
			}
		},
	);

	server.tool(
		TOOL_NAMES.EXECUTE_PYTHON_SCRIPT,
		"Execute Python script directly in TouchDesigner",
		execPythonScriptBody.strict().shape,
		async (params) => {
			try {
				const { script } = params;
				logger.debug(`Executing script: ${script}`);

				const result = await tdClient.execPythonScript(params);
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `Script executed successfully. Result: ${JSON.stringify(result, null, 2)}`,
						},
					],
				};
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.EXECUTE_PYTHON_SCRIPT);
			}
		},
	);
	server.tool(
		TOOL_NAMES.CREATE_TD_NODE,
		"Create a new node in TouchDesigner",
		createNodeBody.strict().shape,
		async (params) => {
			try {
				const { parentPath, nodeType, nodeName } = params;

				const result = await tdClient.createNode({
					parentPath,
					nodeType,
					nodeName,
				});
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `Node created successfully: ${JSON.stringify(result, null, 2)}`,
						},
					],
				};
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
		deleteNodeQueryParams.strict().shape,
		async (params) => {
			try {
				const result = await tdClient.deleteNode(params);
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `Node deleted successfully: ${JSON.stringify(result, null, 2)}`,
						},
					],
				};
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
		"Get all nodes in the parent path (lightweight by default for better performance)",
		getNodesQueryParams.strict().shape,
		async (params) => {
			try {
				const result = await tdClient.getNodes(params);
				if (!result.success) {
					throw result.error;
				}

				const nodeCount = result.data?.nodes?.length || 0;
				const isLightweight = !params.includeProperties;
				const performanceNote = isLightweight
					? " (lightweight mode - set includeProperties=true for full node details)"
					: " (full mode with properties)";

				return {
					content: [
						{
							type: "text" as const,
							text: `Project nodes retrieved (${nodeCount} nodes)${performanceNote}: ${JSON.stringify(result, null, 2)}`,
						},
					],
				};
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
		"Get parameters of a specific node in TouchDesigner",
		getNodeDetailQueryParams.strict().shape,
		async (params) => {
			try {
				const { nodePath } = params;
				const result = await tdClient.getNodeDetail(params);
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `Node parameters for node at path ${nodePath}: ${JSON.stringify(
								result,
								null,
								2,
							)}`,
						},
					],
				};
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
		TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS,
		"Update parameters of a specific node in TouchDesigner",
		updateNodeBody.strict().shape,
		async (params) => {
			try {
				const result = await tdClient.updateNode(params);
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `Node parameters updated successfully: ${JSON.stringify(
								result,
								null,
								2,
							)}`,
						},
					],
				};
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
		execNodeMethodBody.strict().shape,
		async (params) => {
			try {
				const { nodePath, method, args } = params;

				const result = await tdClient.execNodeMethod(params);
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `op('${nodePath}').${method}(${args?.map((v) => `"${v}"`).join(",")}${
								params.kwargs
									? Object.entries(params.kwargs)
											.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
											.join(", ")
									: ""
							})`,
						},
						{
							type: "text" as const,
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			} catch (error) {
				logger.error(error);
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
		"Get list of classes and modules in TouchDesigner",
		async () => {
			try {
				const result = await tdClient.getClasses();
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `TouchDesigner classes list: ${JSON.stringify(result, null, 2)}`,
						},
					],
				};
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
		"Get detailed information about a specific TouchDesigner class or module",
		getTdPythonClassDetailsParams.strict().shape,
		async (params) => {
			try {
				const { className } = params;
				const result = await tdClient.getClassDetails(className);
				if (!result.success) {
					throw result.error;
				}
				return {
					content: [
						{
							type: "text" as const,
							text: `Details for ${className}: ${JSON.stringify(result, null, 2)}`,
						},
					],
				};
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
}

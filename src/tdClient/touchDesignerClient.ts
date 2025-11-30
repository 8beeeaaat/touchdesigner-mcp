import type { ILogger } from "../core/logger.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import { PACKAGE_VERSION } from "../core/version.js";
import {
	createNode as apiCreateNode,
	deleteNode as apiDeleteNode,
	execNodeMethod as apiExecNodeMethod,
	execPythonScript as apiExecPythonScript,
	getModuleHelp as apiGetModuleHelp,
	getNodeDetail as apiGetNodeDetail,
	getNodeErrors as apiGetNodeErrors,
	getNodes as apiGetNodes,
	getTdInfo as apiGetTdInfo,
	getTdPythonClassDetails as apiGetTdPythonClassDetails,
	getTdPythonClasses as apiGetTdPythonClasses,
	updateNode as apiUpdateNode,
	type CreateNodeRequest,
	type DeleteNodeParams,
	type ExecNodeMethodRequest,
	type ExecPythonScriptRequest,
	type GetModuleHelpParams,
	type GetNodeDetailParams,
	type GetNodeErrorsParams,
	type GetNodesParams,
	type UpdateNodeRequest,
} from "../gen/endpoints/TouchDesignerAPI.js";

const updateGuide = `
	1. Download the latest [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip) from the releases page.
	2. Delete the existing \`touchdesigner-mcp-td\` folder and replace it with the newly extracted contents.
	3. Remove the old \`mcp_webserver_base\` component from your TouchDesigner project and import the \`.tox\` from the new folder.
	4. Restart TouchDesigner and the AI agent running the MCP server (e.g., Claude Desktop).
`;

/**
 * Interface for TouchDesignerClient HTTP operations
 */
export interface ITouchDesignerApi {
	execNodeMethod: typeof apiExecNodeMethod;
	execPythonScript: typeof apiExecPythonScript;
	getTdInfo: typeof apiGetTdInfo;
	getNodes: typeof apiGetNodes;
	getNodeDetail: typeof apiGetNodeDetail;
	getNodeErrors: typeof apiGetNodeErrors;
	createNode: typeof apiCreateNode;
	updateNode: typeof apiUpdateNode;
	deleteNode: typeof apiDeleteNode;
	getTdPythonClasses: typeof apiGetTdPythonClasses;
	getTdPythonClassDetails: typeof apiGetTdPythonClassDetails;
	getModuleHelp: typeof apiGetModuleHelp;
}

/**
 * Default implementation of ITouchDesignerApi using generated API clients
 */
const defaultApiClient: ITouchDesignerApi = {
	createNode: apiCreateNode,
	deleteNode: apiDeleteNode,
	execNodeMethod: apiExecNodeMethod,
	execPythonScript: apiExecPythonScript,
	getModuleHelp: apiGetModuleHelp,
	getNodeDetail: apiGetNodeDetail,
	getNodeErrors: apiGetNodeErrors,
	getNodes: apiGetNodes,
	getTdInfo: apiGetTdInfo,
	getTdPythonClassDetails: apiGetTdPythonClassDetails,
	getTdPythonClasses: apiGetTdPythonClasses,
	updateNode: apiUpdateNode,
};

export type TdResponse<T> = {
	success: boolean;
	data: T | null;
	error: string | null;
};

export type ErrorResult<E = Error> = { success: false; error: E };
export type SuccessResult<T> = { success: true; data: NonNullable<T> };

export type Result<T, E = Error> = SuccessResult<T> | ErrorResult<E>;

/**
 * Null logger implementation that discards all logs
 */
const nullLogger: ILogger = {
	sendLog: () => {},
};

/**
 * Handle API error response
 * @param response - API response object
 * @returns ErrorResult object indicating failure
 */
function handleError<T>(response: TdResponse<T>): ErrorResult {
	if (response.error) {
		const errorMessage = response.error;
		return { error: new Error(errorMessage), success: false };
	}
	return { error: new Error("Unknown error occurred"), success: false };
}
/**
 * Handle API response and return a structured result
 * @param response - API response object
 * @returns Result object indicating success or failure
 */
function handleApiResponse<T>(response: TdResponse<T>): Result<T> {
	const { success, data } = response;
	if (!success) {
		return handleError(response);
	}
	if (data === null) {
		return { error: new Error("No data received"), success: false };
	}
	if (data === undefined) {
		return { error: new Error("No data received"), success: false };
	}
	return { data, success: true };
}

/**
 * TouchDesigner client implementation with dependency injection
 * for better testability and separation of concerns
 */
export class TouchDesignerClient {
	private readonly logger: ILogger;
	private readonly api: ITouchDesignerApi;
	private verifiedCompatibilityError: Error | null;

	private logDebug(message: string, context?: Record<string, unknown>) {
		const data = context ? { message, ...context } : { message };
		this.logger.sendLog({
			data,
			level: "debug",
			logger: "TouchDesignerClient",
		});
	}

	/**
	 * Verify compatibility with the TouchDesigner server
	 */
	private async verifyCompatibility() {
		if (this.verifiedCompatibilityError) {
			throw this.verifiedCompatibilityError;
		}

		const result = await this.verifyVersionCompatibility();
		if (result.success) {
			this.verifiedCompatibilityError = null;
			return;
		}
		this.verifiedCompatibilityError = result.error;
		throw result.error;
	}

	/**
	 * Initialize TouchDesigner client with optional dependencies
	 */
	constructor(
		params: {
			logger?: ILogger;
			httpClient?: ITouchDesignerApi;
		} = {},
	) {
		this.logger = params.logger || nullLogger;
		this.api = params.httpClient || defaultApiClient;
		this.verifiedCompatibilityError = null;
	}

	/**
	 * Execute a node method
	 */
	async execNodeMethod<
		DATA extends NonNullable<{
			result: unknown;
		}>,
	>(params: ExecNodeMethodRequest) {
		this.logDebug("Executing node method", {
			method: params.method,
			nodePath: params.nodePath,
		});
		await this.verifyCompatibility();

		const result = await this.api.execNodeMethod(params);
		return handleApiResponse<DATA>(result as TdResponse<DATA>);
	}

	/**
	 * Execute a script in TouchDesigner
	 */
	async execPythonScript<
		DATA extends {
			result: unknown;
		},
	>(params: ExecPythonScriptRequest) {
		this.logDebug("Executing Python script", { params });
		await this.verifyCompatibility();

		const result = await this.api.execPythonScript(params);
		return handleApiResponse<DATA>(result as TdResponse<DATA>);
	}

	/**
	 * Get TouchDesigner server information
	 */
	async getTdInfo() {
		this.logDebug("Getting server info");
		await this.verifyCompatibility();

		const result = await this.api.getTdInfo();
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get list of nodes
	 */
	async getNodes(params: GetNodesParams) {
		this.logDebug("Getting nodes for parent", {
			parentPath: params.parentPath,
		});
		await this.verifyCompatibility();

		const result = await this.api.getNodes(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get node properties
	 */
	async getNodeDetail(params: GetNodeDetailParams) {
		this.logDebug("Getting properties for node", {
			nodePath: params.nodePath,
		});
		await this.verifyCompatibility();

		const result = await this.api.getNodeDetail(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get node error information
	 */
	async getNodeErrors(params: GetNodeErrorsParams) {
		this.logDebug("Checking node errors", {
			nodePath: params.nodePath,
		});
		await this.verifyCompatibility();

		const result = await this.api.getNodeErrors(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Create a new node
	 */
	async createNode(params: CreateNodeRequest) {
		this.logDebug("Creating node", {
			nodeName: params.nodeName,
			nodeType: params.nodeType,
			parentPath: params.parentPath,
		});
		await this.verifyCompatibility();

		const result = await this.api.createNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Update node properties
	 */
	async updateNode(params: UpdateNodeRequest) {
		this.logDebug("Updating node", { nodePath: params.nodePath });
		await this.verifyCompatibility();

		const result = await this.api.updateNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Delete a node
	 */
	async deleteNode(params: DeleteNodeParams) {
		this.logDebug("Deleting node", { nodePath: params.nodePath });
		await this.verifyCompatibility();

		const result = await this.api.deleteNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get list of available Python classes/modules in TouchDesigner
	 */
	async getClasses() {
		this.logDebug("Getting Python classes");
		await this.verifyCompatibility();

		const result = await this.api.getTdPythonClasses();
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get details of a specific class/module
	 */
	async getClassDetails(className: string) {
		this.logDebug("Getting class details", { className });
		await this.verifyCompatibility();

		const result = await this.api.getTdPythonClassDetails(className);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Retrieve Python help() documentation for modules/classes
	 */
	async getModuleHelp(params: GetModuleHelpParams) {
		this.logDebug("Getting module help", { moduleName: params.moduleName });
		await this.verifyCompatibility();

		const result = await this.api.getModuleHelp(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	async verifyVersionCompatibility() {
		const tdInfoResult = await this.api.getTdInfo();
		if (!tdInfoResult.success) {
			return createErrorResult(
				new Error(
					`Failed to retrieve TouchDesigner info for version check: ${tdInfoResult.error}`,
				),
			);
		}
		const apiVersion = tdInfoResult.data?.mcpApiVersion?.trim();
		if (!apiVersion) {
			return createErrorResult(
				new Error(
					`TouchDesigner API server did not report its version. Please reinstall the TouchDesigner components from the latest release.\n${updateGuide}`,
				),
			);
		}

		const normalizedServerVersion = this.normalizeVersion(PACKAGE_VERSION);
		const normalizedApiVersion = this.normalizeVersion(apiVersion);
		if (normalizedServerVersion !== normalizedApiVersion) {
			this.logger.sendLog({
				data: {
					message:
						"MCP server and TouchDesigner API server versions are incompatible",
					touchDesignerApiVersion: normalizedApiVersion,
					touchDesignerServerVersion: normalizedServerVersion,
				},
				level: "error",
				logger: "TouchDesignerClient",
			});

			return createErrorResult(
				new Error(
					`Version mismatch detected between MCP server (${normalizedServerVersion}) and TouchDesigner API server (${normalizedApiVersion}). Update both components to the same release.\n${updateGuide}`,
				),
			);
		}

		return createSuccessResult(undefined);
	}

	private normalizeVersion(version: string): string {
		return version.trim().replace(/^v/i, "");
	}
}

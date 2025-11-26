import type { ILogger } from "../core/logger.js";
import {
	checkNodeErrors as apiCheckNodeErrors,
	createNode as apiCreateNode,
	deleteNode as apiDeleteNode,
	execNodeMethod as apiExecNodeMethod,
	execPythonScript as apiExecPythonScript,
	getModuleHelp as apiGetModuleHelp,
	getNodeDetail as apiGetNodeDetail,
	getNodes as apiGetNodes,
	getTdInfo as apiGetTdInfo,
	getTdPythonClassDetails as apiGetTdPythonClassDetails,
	getTdPythonClasses as apiGetTdPythonClasses,
	updateNode as apiUpdateNode,
	type CheckNodeErrorsRequest,
	type CreateNodeRequest,
	type DeleteNodeParams,
	type ExecNodeMethodRequest,
	type ExecPythonScriptRequest,
	type GetModuleHelpRequest,
	type GetNodeDetailParams,
	type GetNodesParams,
	type UpdateNodeRequest,
} from "../gen/endpoints/TouchDesignerAPI.js";

/**
 * Server information returned by TouchDesigner
 */
export interface TdInfo {
	server: string;
	version: string;
	status?: string;
	buildDate?: string;
	platform?: string;
}

/**
 * Interface for TouchDesignerClient HTTP operations
 */
export interface ITouchDesignerApi {
	checkNodeErrors: typeof apiCheckNodeErrors;
	execNodeMethod: typeof apiExecNodeMethod;
	execPythonScript: typeof apiExecPythonScript;
	getModuleHelp: typeof apiGetModuleHelp;
	getTdInfo: typeof apiGetTdInfo;
	getNodes: typeof apiGetNodes;
	getNodeDetail: typeof apiGetNodeDetail;
	createNode: typeof apiCreateNode;
	updateNode: typeof apiUpdateNode;
	deleteNode: typeof apiDeleteNode;
	getTdPythonClasses: typeof apiGetTdPythonClasses;
	getTdPythonClassDetails: typeof apiGetTdPythonClassDetails;
}

/**
 * Default implementation of ITouchDesignerApi using generated API clients
 */
const defaultApiClient: ITouchDesignerApi = {
	checkNodeErrors: apiCheckNodeErrors,
	execNodeMethod: apiExecNodeMethod,
	execPythonScript: apiExecPythonScript,
	getModuleHelp: apiGetModuleHelp,
	getTdInfo: apiGetTdInfo,
	getNodes: apiGetNodes,
	getNodeDetail: apiGetNodeDetail,
	createNode: apiCreateNode,
	updateNode: apiUpdateNode,
	deleteNode: apiDeleteNode,
	getTdPythonClasses: apiGetTdPythonClasses,
	getTdPythonClassDetails: apiGetTdPythonClassDetails,
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
	debug: () => {},
	log: () => {},
	warn: () => {},
	error: () => {},
};

/**
 * Handle API error response
 * @param response - API response object
 * @returns ErrorResult object indicating failure
 */
function handleError<T>(response: TdResponse<T>): ErrorResult {
	if (response.error) {
		const errorMessage = response.error;
		return { success: false, error: new Error(errorMessage) };
	}
	return { success: false, error: new Error("Unknown error occurred") };
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
		return { success: false, error: new Error("No data received") };
	}
	if (data === undefined) {
		return { success: false, error: new Error("No data received") };
	}
	return { success: true, data };
}

/**
 * TouchDesigner client implementation with dependency injection
 * for better testability and separation of concerns
 */
export class TouchDesignerClient {
	private readonly logger: ILogger;
	private readonly api: ITouchDesignerApi;

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
	}

	/**
	 * Execute a node method
	 */
	async execNodeMethod<
		DATA extends NonNullable<{
			result: unknown;
		}>,
	>(params: ExecNodeMethodRequest) {
		this.logger.debug(
			`Executing node method: ${params.method} on ${params.nodePath}`,
		);

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
		this.logger.debug(`Executing Python script: ${params}`);
		const result = await this.api.execPythonScript(params);
		return handleApiResponse<DATA>(result as TdResponse<DATA>);
	}

	/**
	 * Get TouchDesigner server information
	 */
	async getTdInfo() {
		this.logger.debug("Getting server info");
		const result = await this.api.getTdInfo();
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get list of nodes
	 */
	async getNodes(params: GetNodesParams) {
		this.logger.debug(`Getting nodes for parent: ${params.parentPath}`);
		const result = await this.api.getNodes(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get node properties
	 */
	async getNodeDetail(params: GetNodeDetailParams) {
		this.logger.debug(`Getting properties for node: ${params.nodePath}`);
		const result = await this.api.getNodeDetail(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Create a new node
	 */
	async createNode(params: CreateNodeRequest) {
		this.logger.debug(
			`Creating node: ${params.nodeName} of type ${params.nodeType} under ${params.parentPath}`,
		);
		const result = await this.api.createNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Update node properties
	 */
	async updateNode(params: UpdateNodeRequest) {
		this.logger.debug(`Updating node: ${params.nodePath}`);
		const result = await this.api.updateNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Delete a node
	 */
	async deleteNode(params: DeleteNodeParams) {
		this.logger.debug(`Deleting node: ${params.nodePath}`);
		const result = await this.api.deleteNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get list of available Python classes/modules in TouchDesigner
	 */
	async getClasses() {
		this.logger.debug("Getting Python classes");
		const result = await this.api.getTdPythonClasses();
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get details of a specific class/module
	 */
	async getClassDetails(className: string) {
		this.logger.debug(`Getting class details for: ${className}`);
		const result = await this.api.getTdPythonClassDetails(className);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get help documentation for a module
	 */
	async getModuleHelp(params: GetModuleHelpRequest) {
		this.logger.debug(`Getting help for module: ${params.moduleName}`);
		const result = await this.api.getModuleHelp(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Check errors in a node
	 */
	async checkNodeErrors(params: CheckNodeErrorsRequest) {
		this.logger.debug(`Checking errors for node: ${params.nodePath}`);
		const result = await this.api.checkNodeErrors(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}
}

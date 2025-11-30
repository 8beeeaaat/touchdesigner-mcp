import type { ILogger } from "../core/logger.js";
import {
	createNode as apiCreateNode,
	deleteNode as apiDeleteNode,
	execNodeMethod as apiExecNodeMethod,
	execPythonScript as apiExecPythonScript,
	getNodeDetail as apiGetNodeDetail,
	getNodes as apiGetNodes,
	getTdInfo as apiGetTdInfo,
	getTdPythonClassDetails as apiGetTdPythonClassDetails,
	getTdPythonClasses as apiGetTdPythonClasses,
	updateNode as apiUpdateNode,
	type CreateNodeRequest,
	type DeleteNodeParams,
	type ExecNodeMethodRequest,
	type ExecPythonScriptRequest,
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
	execNodeMethod: typeof apiExecNodeMethod;
	execPythonScript: typeof apiExecPythonScript;
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
	createNode: apiCreateNode,
	deleteNode: apiDeleteNode,
	execNodeMethod: apiExecNodeMethod,
	execPythonScript: apiExecPythonScript,
	getNodeDetail: apiGetNodeDetail,
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

	private logDebug(message: string, context?: Record<string, unknown>) {
		const data = context ? { message, ...context } : { message };
		this.logger.sendLog({
			data,
			level: "debug",
			logger: "TouchDesignerClient",
		});
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
		const result = await this.api.execPythonScript(params);
		return handleApiResponse<DATA>(result as TdResponse<DATA>);
	}

	/**
	 * Get TouchDesigner server information
	 */
	async getTdInfo() {
		this.logDebug("Getting server info");
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
		const result = await this.api.getNodeDetail(params);
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
		const result = await this.api.createNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Update node properties
	 */
	async updateNode(params: UpdateNodeRequest) {
		this.logDebug("Updating node", { nodePath: params.nodePath });
		const result = await this.api.updateNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Delete a node
	 */
	async deleteNode(params: DeleteNodeParams) {
		this.logDebug("Deleting node", { nodePath: params.nodePath });
		const result = await this.api.deleteNode(params);
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get list of available Python classes/modules in TouchDesigner
	 */
	async getClasses() {
		this.logDebug("Getting Python classes");
		const result = await this.api.getTdPythonClasses();
		return handleApiResponse<(typeof result)["data"]>(result);
	}

	/**
	 * Get details of a specific class/module
	 */
	async getClassDetails(className: string) {
		this.logDebug("Getting class details", { className });
		const result = await this.api.getTdPythonClassDetails(className);
		return handleApiResponse<(typeof result)["data"]>(result);
	}
}

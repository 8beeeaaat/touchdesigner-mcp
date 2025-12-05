import {
	type CompatibilityPolicyErrorLevel,
	getCompatibilityPolicy,
	getCompatibilityPolicyType,
} from "../core/compatibility.js";
import type { ILogger } from "../core/logger.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import {
	MCP_SERVER_VERSION,
	MIN_COMPATIBLE_API_VERSION,
} from "../core/version.js";
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

export const ERROR_CACHE_TTL_MS = 5000; // 5 seconds

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
	private cachedCompatibilityCheck: boolean;
	private errorCacheTimestamp: number | null;

	private logDebug(message: string, context?: Record<string, unknown>) {
		const data = context ? { message, ...context } : { message };
		this.logger.sendLog({
			data,
			level: "debug",
			logger: "TouchDesignerClient",
		});
	}

	/**
	 * Check if the cached error should be cleared (TTL expired)
	 */
	private shouldClearErrorCache(): boolean {
		if (!this.errorCacheTimestamp) {
			return false;
		}
		const now = Date.now();
		return now - this.errorCacheTimestamp >= ERROR_CACHE_TTL_MS;
	}

	/**
	 * Verify compatibility with the TouchDesigner server
	 */
	private async verifyCompatibility() {
		// If we've already verified compatibility successfully, skip re-verification
		if (this.cachedCompatibilityCheck && !this.verifiedCompatibilityError) {
			return;
		}

		// Clear cached error if TTL has expired
		if (this.verifiedCompatibilityError && this.shouldClearErrorCache()) {
			this.logDebug("Clearing cached connection error, retrying...");
			this.verifiedCompatibilityError = null;
			this.errorCacheTimestamp = null;
			this.cachedCompatibilityCheck = false;
		}

		if (this.verifiedCompatibilityError) {
			throw this.verifiedCompatibilityError;
		}

		const result = await this.verifyVersionCompatibility();
		if (result.success) {
			this.verifiedCompatibilityError = null;
			this.errorCacheTimestamp = null;
			this.cachedCompatibilityCheck = true;
			return;
		}
		this.verifiedCompatibilityError = result.error;
		this.errorCacheTimestamp = Date.now();
		this.cachedCompatibilityCheck = false;
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
		this.cachedCompatibilityCheck = false;
		this.errorCacheTimestamp = null;
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
		let tdInfoResult: Awaited<ReturnType<ITouchDesignerApi["getTdInfo"]>>;
		try {
			tdInfoResult = await this.api.getTdInfo();
		} catch (error) {
			const rawMessage = error instanceof Error ? error.message : String(error);
			const errorMessage = this.formatConnectionError(rawMessage);
			this.logger.sendLog({
				data: { error: rawMessage },
				level: "error",
				logger: "TouchDesignerClient",
			});
			return createErrorResult(new Error(errorMessage));
		}
		if (!tdInfoResult.success) {
			const errorMessage = this.formatConnectionError(tdInfoResult.error);
			this.logger.sendLog({
				data: { error: tdInfoResult.error },
				level: "error",
				logger: "TouchDesignerClient",
			});
			return createErrorResult(new Error(errorMessage));
		}

		const apiVersionRaw = tdInfoResult.data?.mcpApiVersion?.trim();
		if (!apiVersionRaw) {
			return createErrorResult(
				new Error(
					"TouchDesigner API server did not report its version. Please reinstall the TouchDesigner components from the latest release.\n" +
						"Download: https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest",
				),
			);
		}

		const result = this.checkVersionCompatibility(
			MCP_SERVER_VERSION,
			apiVersionRaw,
		);

		this.logger.sendLog({
			data: {
				apiVersion: result.details.apiVersion,
				mcpVersion: result.details.mcpVersion,
				message: result.message,
				minRequired: result.details.minRequired,
			},
			level: result.level,
			logger: "TouchDesignerClient",
		});

		if (result.level === "error") {
			return createErrorResult(new Error(result.message));
		}

		return createSuccessResult(undefined);
	}

	/**
	 * Format connection errors with helpful messages
	 */
	private formatConnectionError(error: string | null): string {
		if (!error) {
			return "Failed to connect to TouchDesigner API server (unknown error)";
		}

		// Check for common connection errors
		if (error.includes("ECONNREFUSED") || error.includes("connect refused")) {
			return `🔌 TouchDesigner Connection Failed

Cannot connect to TouchDesigner API server at the configured address.

Possible causes:
  1. TouchDesigner is not running
     → Please start TouchDesigner

  2. WebServer DAT is not active
     → Import 'mcp_webserver_base.tox' and ensure it's active

  3. Wrong port configuration
     → Default port is 9981, check your configuration

For setup instructions, visit:
https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest

Original error: ${error}`;
		}

		if (error.includes("ETIMEDOUT") || error.includes("timeout")) {
			return `⏱️  TouchDesigner Connection Timeout

The connection to TouchDesigner timed out.

Possible causes:
  1. TouchDesigner is slow to respond
  2. Network issues
  3. WebServer DAT is overloaded

Try restarting TouchDesigner or check the network connection.

Original error: ${error}`;
		}

		if (error.includes("ENOTFOUND") || error.includes("getaddrinfo")) {
			return `🌐 Invalid Host Configuration

Cannot resolve the TouchDesigner API server hostname.

Please check your host configuration (default: 127.0.0.1)

Original error: ${error}`;
		}

		// Generic error message
		return `Failed to connect to TouchDesigner API server: ${error}`;
	}

	private checkVersionCompatibility(
		mcpVersion: string,
		apiVersion: string,
	): {
		compatible: boolean;
		level: CompatibilityPolicyErrorLevel;
		message: string;
		details: {
			mcpVersion: string;
			apiVersion: string;
			minRequired: string;
		};
	} {
		const policyType = getCompatibilityPolicyType(mcpVersion, apiVersion);
		const policy = getCompatibilityPolicy(policyType);
		const message = policy.message(mcpVersion, apiVersion);

		return {
			compatible: policy.compatible,
			details: {
				apiVersion,
				mcpVersion,
				minRequired: MIN_COMPATIBLE_API_VERSION,
			},
			level: policy.level,
			message,
		};
	}
}

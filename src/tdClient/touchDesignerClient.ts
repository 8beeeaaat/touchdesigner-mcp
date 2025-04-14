import type { NodeFamilyType } from "src/gen/models/nodeFamilyType.js";
/**
 * TouchDesigner client implementation using Orval generated API client
 */
import type { z } from "zod";
import {
	createNode,
	deleteNode,
	getNodeProperty,
	getNodeTypeDefaultParameters,
	getProjectNodes,
	getServerInfo,
	updateNode,
} from "../gen/endpoints/touchDesignerAPI.js";
import type { GetNodeTypeDefaultParametersParams } from "../gen/models/getNodeTypeDefaultParametersParams.js";
import type { TDConnectionParams } from "../gen/models/tDConnectionParams.js";
import type { TopNodeSchemas, TopNodeType } from "../schemas/index.js";
import type { ILogger } from "../util.js";

/**
 * Result type representing API operation result
 */
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };

export class TouchDesignerClient {
	private readonly logger: ILogger;

	constructor(logger: ILogger) {
		this.logger = logger;
	}

	private async handleRequest<T>(
		requestFn: () => Promise<T>,
		operationName: string,
	): Promise<Result<T, Error>> {
		try {
			this.logger.debug(`Executing ${operationName}...`);
			const result = await requestFn();
			this.logger.debug(`${operationName} succeeded`);
			return { success: true, data: result };
		} catch (error) {
			this.logger.error(`Error occurred in ${operationName}`, error);
			const err = error instanceof Error ? error : new Error(String(error));
			return { success: false, error: err };
		}
	}

	/**
	 * Get TouchDesigner server information
	 */
	async getServerInfo() {
		return this.handleRequest(() => getServerInfo(), "Server info retrieval");
	}

	/**
	 * Get list of nodes in project
	 */
	async getProjectNodes() {
		return this.handleRequest(() => getProjectNodes(), "Project nodes listing");
	}

	/**
	 * Get node properties
	 */
	async getNodeProperty(nodePath: string) {
		return this.handleRequest(
			() => getNodeProperty(nodePath),
			`Node properties retrieval for '${nodePath}'`,
		);
	}

	/**
	 * Get default parameters for node type
	 */
	async getNodeTypeDefaultParameters(
		params: GetNodeTypeDefaultParametersParams,
	): Promise<Result<unknown, Error>> {
		return this.handleRequest(
			() => getNodeTypeDefaultParameters(params),
			`Default parameters retrieval for '${params.nodeType}'`,
		);
	}

	/**
	 * Create node
	 */
	async createNode(params: {
		nodeName?: string;
		nodeFamily: NodeFamilyType;
		nodeType: string;
		connection?: TDConnectionParams;
		parameters?: Record<string, unknown>;
	}): Promise<Result<unknown, Error>> {
		return this.handleRequest(
			() => createNode(params),
			`Node creation for '${params.nodeName || params.nodeType}'`,
		);
	}

	/**
	 * Update node
	 */
	async updateNode<T extends TopNodeType>(params: {
		nodePath: string;
		parameters?: Partial<z.infer<(typeof TopNodeSchemas)[T]>>;
		connection?: TDConnectionParams;
	}): Promise<Result<unknown, Error>> {
		return this.handleRequest(
			() =>
				updateNode(params.nodePath, {
					parameters: params.parameters,
					connection: params.connection,
				}),
			`Node update for '${params.nodePath}'`,
		);
	}

	/**
	 * Delete node
	 */
	async deleteNode(nodePath: string): Promise<Result<unknown, Error>> {
		return this.handleRequest(
			() => deleteNode(nodePath),
			`Node deletion for '${nodePath}'`,
		);
	}
}

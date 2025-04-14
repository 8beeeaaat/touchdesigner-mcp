import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
	GetPromptRequestSchema,
	ListPromptsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { NodeFamilyType } from "./gen/models/nodeFamilyType.js";
import { PROMPTS, getPrompt } from "./prompts/index.js";
import {
	CreateTDNodeParams,
	DeleteTDNodeParams,
	GetNodeTypeDefaultParametersQueryParams,
	GetTDNodePropertiesParams,
	NodeSchemasByFamily,
	UpdateTDNodePropertiesParams,
} from "./schemas/common/index.js";
import {
	type TouchDesignerClient,
	createTouchDesignerClient,
} from "./tdClient/index.js";
import { Logger } from "./util.js";

// Result型の定義
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };

const RESOURCE_URIS = {
	node_schemas: "tdmcp:///node_schemas",
};

export class TouchDesignerServer {
	readonly server: McpServer;
	readonly logger: Logger;
	readonly tdClient: TouchDesignerClient;
	transport: Transport | null = null;

	constructor() {
		this.server = new McpServer(
			{
				name: "TouchDesigner",
				version: "0.1.0",
			},
			{
				capabilities: {
					prompts: {},
					logging: {},
					tools: {},
					resources: {},
				},
			},
		);
		this.registerPrompts();
		this.registerTools();
		this.registerResources();
		this.logger = new Logger(this.server);

		// Use factory function for client creation
		this.tdClient = createTouchDesignerClient({
			logger: this.logger,
		});
	}

	async connect(transport: Transport): Promise<Result<void, Error>> {
		if (this.isConnectedToMCP()) {
			this.logger.log("MCP server already connected");
			return { success: true, data: void 0 };
		}

		this.transport = transport;
		try {
			await this.server.connect(transport);
			this.logger.log("Server connected and ready to process requests");

			const connectionResult = await this.checkTDConnection();
			if (!connectionResult.success) {
				this.transport = null;
				return { success: false, error: connectionResult.error };
			}

			this.logger.log("MCP Server running on stdio");
			return { success: true, data: void 0 };
		} catch (error) {
			this.transport = null;
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error(
				"Fatal error starting server! Check TouchDesigner setup and starting webserver",
				err,
			);
			return { success: false, error: err };
		}
	}

	async disconnect(): Promise<Result<void, Error>> {
		if (!this.isConnectedToMCP()) {
			console.log("MCP server not connected");
			return { success: true, data: void 0 };
		}

		try {
			await this.server.close();
			console.log("MCP server disconnected from MCP");
			this.transport = null;
			return { success: true, data: void 0 };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.error("Error disconnecting from server", err);
			return { success: false, error: err };
		}
	}

	isConnectedToMCP(): boolean {
		return this.transport !== null;
	}

	private registerPrompts(): void {
		this.server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
			return {
				prompts: Object.values(PROMPTS),
			};
		});
		this.server.server.setRequestHandler(
			GetPromptRequestSchema,
			async (request) => {
				try {
					const prompt = getPrompt(request.params.name);

					if (prompt.name === PROMPTS.CheckNode.name) {
						if (!request.params.arguments?.nodeName) {
							throw new Error("Missing required argument: nodeName");
						}
						const { nodeName, nodeFamily, nodeType } = request.params.arguments;
						const messages = prompt.getMessages({
							nodeName,
							nodeFamily,
							nodeType,
						});
						return { messages };
					}
					throw new Error(
						`Prompt implementation for ${request.params.name} not found`,
					);
				} catch (error) {
					throw new Error(
						error instanceof Error ? error.message : String(error),
					);
				}
			},
		);
	}

	protected validateToolParams(
		family: string,
		nodeType: string,
		schemas = NodeSchemasByFamily,
	): Result<boolean, Error> {
		const familySchemas = schemas[family as NodeFamilyType];
		if (!familySchemas) {
			return {
				success: false,
				error: new Error(
					`No schemas found for family: ${family}. Supported families: ${Object.keys(schemas).join(", ")}`,
				),
			};
		}
		const nodeSchema = familySchemas[nodeType];
		if (!nodeSchema) {
			return {
				success: false,
				error: new Error(
					`No schema found for nodeType: ${nodeType} in family: ${family}. Supported node types: ${Object.keys(familySchemas).join(", ")}`,
				),
			};
		}
		return { success: true, data: true };
	}

	private registerTools(): void {
		this.server.tool(
			"create_td_node",
			"Create a new node in TouchDesigner",
			CreateTDNodeParams,
			async (params) => {
				try {
					const { nodeFamily, nodeType } = params;

					const validationResult = this.validateToolParams(
						nodeFamily,
						nodeType,
					);
					if (!validationResult.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Validation error: ${validationResult.error.message}`,
								},
							],
						};
					}

					const result = await this.tdClient.createNode(params);
					if (!result.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Failed to create node in TouchDesigner: ${result.error.message}. Check reference resources: "${RESOURCE_URIS.node_schemas}"`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text" as const,
								text: `Node created successfully: ${JSON.stringify(result.data, null, 2)}`,
							},
						],
					};
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.error("Error creating node", err);
					return {
						content: [
							{
								type: "text" as const,
								text: `Failed to create node in TouchDesigner: ${err.message}. Check reference resources: "${RESOURCE_URIS.node_schemas}"`,
							},
						],
					};
				}
			},
		);

		this.server.tool(
			"delete_td_node",
			"Delete an existing node in TouchDesigner",
			DeleteTDNodeParams,
			async (params) => {
				try {
					const { nodePath } = params;
					const result = await this.tdClient.deleteNode(nodePath);
					if (!result.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Failed to delete node from TouchDesigner: ${result.error.message}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text" as const,
								text: `Node deleted successfully: ${JSON.stringify(result.data, null, 2)}`,
							},
						],
					};
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.error("Error deleting node", err);
					return {
						content: [
							{
								type: "text" as const,
								text: `Failed to delete node from TouchDesigner: ${err.message}`,
							},
						],
					};
				}
			},
		);

		// ...remaining tools with similar error handling pattern...

		this.server.tool(
			"get_td_server_info",
			"Get server information from TouchDesigner",
			async () => {
				try {
					const result = await this.tdClient.getServerInfo();
					if (!result.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Failed to get server info: ${result.error.message}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text" as const,
								text: `Server information: ${JSON.stringify(result.data, null, 2)}`,
							},
						],
					};
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.error("Error getting server info", err);
					return {
						content: [
							{
								type: "text" as const,
								text: `Failed to get server info: ${err.message}`,
							},
						],
					};
				}
			},
		);

		this.server.tool(
			"get_td_project_nodes",
			"Get all nodes in the current TouchDesigner project",
			async () => {
				try {
					const result = await this.tdClient.getProjectNodes();
					if (!result.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Failed to retrieve project nodes from TouchDesigner: ${result.error.message}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text" as const,
								text: `Project nodes retrieved: ${JSON.stringify(result.data, null, 2)}`,
							},
						],
					};
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.error("Error getting project nodes", err);
					return {
						content: [
							{
								type: "text" as const,
								text: `Failed to retrieve project nodes from TouchDesigner: ${err.message}`,
							},
						],
					};
				}
			},
		);

		this.server.tool(
			"get_td_default_node_parameters",
			"Get default parameters of a specific node type in TouchDesigner",
			GetNodeTypeDefaultParametersQueryParams,
			async (params) => {
				try {
					const { nodeFamily, nodeType } = params;
					const validationResult = this.validateToolParams(
						nodeFamily,
						nodeType,
					);
					if (!validationResult.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Validation error: ${validationResult.error.message}`,
								},
							],
						};
					}

					const result = await this.tdClient.getNodeTypeDefaultParameters({
						nodeFamily: nodeFamily as NodeFamilyType,
						nodeType: nodeType as string,
					});

					if (!result.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Failed to retrieve node default parameters from TouchDesigner: ${result.error.message}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text" as const,
								text: `Default parameters for node type ${nodeType} in family ${nodeFamily}: ${JSON.stringify(
									result.data,
									null,
									2,
								)}`,
							},
						],
					};
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.error("Error getting default node parameters", err);
					return {
						content: [
							{
								type: "text" as const,
								text: `Failed to retrieve node default parameters from TouchDesigner: ${err.message}`,
							},
						],
					};
				}
			},
		);

		this.server.tool(
			"get_td_node_property",
			"Get parameters of a specific node in TouchDesigner",
			GetTDNodePropertiesParams,
			async (params) => {
				try {
					const { nodePath } = params;
					const result = await this.tdClient.getNodeProperty(
						nodePath as string,
					);

					if (!result.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Failed to retrieve node properties from TouchDesigner: ${result.error.message}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text" as const,
								text: `Node properties for node at path ${nodePath}: ${JSON.stringify(
									result.data,
									null,
									2,
								)}`,
							},
						],
					};
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.error("Error getting node property", err);
					return {
						content: [
							{
								type: "text" as const,
								text: `Failed to retrieve node properties from TouchDesigner: ${err.message}`,
							},
						],
					};
				}
			},
		);

		this.server.tool(
			"update_td_node_properties",
			"Update parameters of a specific node in TouchDesigner",
			UpdateTDNodePropertiesParams,
			async (params) => {
				try {
					const { nodePath, parameters, connection } = params;
					const result = await this.tdClient.updateNode({
						nodePath: nodePath as string,
						parameters: parameters || {},
						connection: connection || {},
					});

					if (!result.success) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Failed to update node properties in TouchDesigner: ${result.error.message}. Check reference resources: "${RESOURCE_URIS.node_schemas}"`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text" as const,
								text: `Node properties updated successfully: ${JSON.stringify(
									result.data,
									null,
									2,
								)}`,
							},
						],
					};
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.error("Error updating node properties", err);
					return {
						content: [
							{
								type: "text" as const,
								text: `Failed to update node properties in TouchDesigner: ${err.message}. Check reference resources: "${RESOURCE_URIS.node_schemas}"`,
							},
						],
					};
				}
			},
		);
	}

	private registerResources(): void {
		this.server.server.setRequestHandler(
			ListResourcesRequestSchema,
			async () => {
				return {
					resources: [
						{
							uri: RESOURCE_URIS.node_schemas,
							name: "Node Schemas",
							description: "Schemas for TouchDesigner nodes",
							mimeType: "application/json",
						},
					],
				};
			},
		);

		this.server.server.setRequestHandler(
			ReadResourceRequestSchema,
			async (request) => {
				this.logger.log("Read resource request received", request.params);
				const uri = request.params.uri;

				if (uri === RESOURCE_URIS.node_schemas) {
					return {
						contents: [
							{
								uri,
								mimeType: "application/json",
								text: JSON.stringify(NodeSchemasByFamily, null, 2),
							},
						],
					};
				}

				throw new Error("Resource not found");
			},
		);
	}

	protected async checkTDConnection(): Promise<Result<unknown, Error>> {
		this.logger.log("Testing connection to TouchDesigner server...");
		try {
			const result = await this.tdClient.getServerInfo();
			if (!result.success) {
				return { success: false, error: result.error };
			}
			return { success: true, data: result.data };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return { success: false, error: err };
		}
	}
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ILogger } from "../core/logger.js";
import { McpLogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { registerPrompts } from "../features/prompts/index.js";
import { registerTools } from "../features/tools/index.js";
import { createTouchDesignerClient } from "../tdClient/index.js";
import type { TouchDesignerClient } from "../tdClient/touchDesignerClient.js";
import { ConnectionManager } from "./connectionManager.js";

/**
 * TouchDesigner MCP Server implementation
 */
export class TouchDesignerServer {
	readonly server: McpServer;
	readonly logger: ILogger;
	readonly tdClient: TouchDesignerClient;
	private readonly connectionManager: ConnectionManager;

	/**
	 * Initialize TouchDesignerServer with proper dependency injection
	 */
	constructor() {
		this.server = new McpServer(
			{
				name: "TouchDesigner",
				version: "0.2.10",
			},
			{
				capabilities: {
					prompts: {},
					logging: {},
					tools: {},
				},
			},
		);
		this.logger = new McpLogger(this.server);

		this.tdClient = createTouchDesignerClient({ logger: this.logger });

		this.connectionManager = new ConnectionManager(
			this.server,
			this.logger,
			this.tdClient,
		);

		this.registerAllFeatures();
	}

	/**
	 * Connect to MCP transport
	 */
	async connect(transport: Transport): Promise<Result<void, Error>> {
		return this.connectionManager.connect(transport);
	}

	/**
	 * Disconnect from MCP transport
	 */
	async disconnect(): Promise<Result<void, Error>> {
		return this.connectionManager.disconnect();
	}

	/**
	 * Check if connected to MCP transport
	 */
	isConnectedToMCP(): boolean {
		return this.connectionManager.isConnected();
	}

	/**
	 * Register all features with the server
	 * Only called after all dependencies are initialized
	 */
	private registerAllFeatures(): void {
		registerPrompts(this.server, this.logger);
		registerTools(this.server, this.logger, this.tdClient);
	}
}

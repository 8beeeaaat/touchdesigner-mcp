import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ILogger } from "../core/logger.js";
import { McpLogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import {
	getTargetRegistry,
	type TargetRegistry,
} from "../core/targetRegistry.js";
import { MCP_SERVER_VERSION } from "../core/version.js";
import { registerPrompts } from "../features/prompts/index.js";
import { registerTools } from "../features/tools/index.js";
import { createTouchDesignerClient } from "../tdClient/index.js";
import type { TouchDesignerClient } from "../tdClient/touchDesignerClient.js";
import { ConnectionManager } from "./connectionManager.js";

/**
 * Capabilities supported by TouchDesigner MCP Server
 */
export interface TouchDesignerCapabilities {
	logging: Record<string, never>;
	prompts: Record<string, never>;
	tools: Record<string, never>;
}

/**
 * TouchDesigner MCP Server implementation
 */
export class TouchDesignerServer {
	readonly server: McpServer;
	readonly logger: ILogger;
	readonly tdClient: TouchDesignerClient;
	readonly registry: TargetRegistry;
	private readonly connectionManager: ConnectionManager;

	constructor() {
		this.server = new McpServer(
			{
				name: "TouchDesigner",
				version: MCP_SERVER_VERSION,
			},
			{
				capabilities: {
					logging: {},
					prompts: {},
					tools: {},
				},
			},
		);
		this.logger = new McpLogger(this.server);

		this.tdClient = createTouchDesignerClient({ logger: this.logger });
		this.registry = getTargetRegistry();

		this.connectionManager = new ConnectionManager(this.server, this.logger);

		this.registerAllFeatures();
	}

	static create(): McpServer {
		const instance = new TouchDesignerServer();
		return instance.server;
	}

	async connect(transport: Transport): Promise<Result<void, Error>> {
		return this.connectionManager.connect(transport);
	}

	async disconnect(): Promise<Result<void, Error>> {
		return this.connectionManager.disconnect();
	}

	isConnectedToMCP(): boolean {
		return this.connectionManager.isConnected();
	}

	private registerAllFeatures(): void {
		registerPrompts(this.server, this.logger);
		registerTools(this.server, this.logger, this.tdClient, this.registry);
	}
}

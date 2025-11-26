import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ILogger } from "../core/logger.js";
import { McpLogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import {
	checkVersionCompatibility,
	formatVersionWarning,
} from "../core/versionCheck.js";
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
				version: "1.1.2",
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

		// Perform version check asynchronously (non-blocking)
		// This warns users if their TouchDesigner component is outdated
		this.performVersionCheck().catch((err) => {
			// Log error but don't block initialization
			this.logger.warn(`Version check failed: ${err.message}`);
		});
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

	/**
	 * Check API version compatibility with TouchDesigner server
	 *
	 * This is called asynchronously during initialization to verify
	 * that the Python server component matches the expected API version.
	 * Logs warnings if versions are incompatible.
	 */
	private async performVersionCheck(): Promise<void> {
		try {
			const info = await this.tdClient.getTdInfo();

			if (!info.success) {
				// Server not reachable - will be caught by other error handling
				return;
			}

			const serverApiVersion = info.data.apiVersion;
			const checkResult = checkVersionCompatibility(serverApiVersion);

			if (!checkResult.compatible) {
				const warning = formatVersionWarning(checkResult);
				this.logger.warn(warning);
			} else {
				this.logger.debug(
					`API version check passed: client=${checkResult.clientVersion}, server=${checkResult.serverVersion}`,
				);
			}
		} catch (err) {
			// Network errors are logged but don't block initialization
			// Users will get more specific errors when they try to use tools
			throw new Error(
				`Failed to connect to TouchDesigner: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
}

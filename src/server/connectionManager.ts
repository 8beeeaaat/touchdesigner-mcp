import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type { TouchDesignerClient } from "../tdClient/touchDesignerClient.js";

/**
 * Manages the connection between TouchDesignerServer and MCP transport
 */
export class ConnectionManager {
	private transport: Transport | null = null;

	constructor(
		private readonly server: McpServer,
		private readonly logger: ILogger,
		private readonly tdClient: TouchDesignerClient,
	) {}

	/**
	 * Connect to MCP transport
	 */
	async connect(transport: Transport): Promise<Result<void, Error>> {
		if (this.isConnected()) {
			this.logger.sendLog({
				data: "MCP server already connected",
				level: "info",
			});
			return createSuccessResult(undefined);
		}

		this.transport = transport;
		try {
			await this.server.connect(transport);
			this.logger.sendLog({
				data: `Server connected and ready to process requests: ${process.env.TD_WEB_SERVER_HOST}:${process.env.TD_WEB_SERVER_PORT}`,
				level: "info",
			});

			// Connection will be checked when tools are actually used
			const connectionResult = await this.checkTDConnection();
			if (!connectionResult.success) {
				throw new Error(
					`Failed to connect to TouchDesigner. The mcp_webserver_base on TouchDesigner not currently available: ${connectionResult.error.message}`,
				);
			}
			this.logger.sendLog({
				data: "TouchDesigner connection verified",
				level: "info",
			});
			return createSuccessResult(undefined);
		} catch (error) {
			this.transport = null;
			const err = error instanceof Error ? error : new Error(String(error));
			console.error(
				"Fatal error starting server! Check TouchDesigner setup and starting webserver. For detailed setup instructions, see https://github.com/8beeeaaat/touchdesigner-mcp",
				err,
			);
			return createErrorResult(err);
		}
	}

	/**
	 * Disconnect from MCP transport
	 */
	async disconnect(): Promise<Result<void, Error>> {
		if (!this.isConnected()) {
			console.log("MCP server not connected");
			return createSuccessResult(undefined);
		}

		try {
			await this.server.close();
			console.log("MCP server disconnected from MCP");
			this.transport = null;
			return createSuccessResult(undefined);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			console.error("Error disconnecting from server", err);
			return createErrorResult(err);
		}
	}

	/**
	 * Check if connected to MCP transport
	 */
	isConnected(): boolean {
		return this.transport !== null;
	}

	/**
	 * Check connection to TouchDesigner
	 */
	private async checkTDConnection(): Promise<Result<unknown, Error>> {
		this.logger.sendLog({
			data: "Testing connection to TouchDesigner server...",
			level: "info",
		});
		try {
			const result = await this.tdClient.getTdInfo();
			if (!result.success) {
				throw result.error;
			}
			return createSuccessResult(result.data);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(err);
		}
	}
}

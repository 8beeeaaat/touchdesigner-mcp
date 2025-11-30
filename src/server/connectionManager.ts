import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import {
	checkVersionCompatibility,
	formatVersionWarning,
} from "../core/versionCheck.js";
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
				level: "warning",
				message: "MCP server already connected",
			});
			return createSuccessResult(undefined);
		}

		this.transport = transport;
		try {
			await this.server.connect(transport);
			this.logger.sendLog({
				level: "debug",
				message: `Server connected and ready to process requests: ${process.env.TD_WEB_SERVER_HOST}:${process.env.TD_WEB_SERVER_PORT}`,
			});

			// Connection will be checked when tools are actually used
			const connectionResult = await this.checkTDConnection();
			if (!connectionResult.success) {
				throw connectionResult.error;
			}
			this.logger.sendLog({
				level: "info",
				message: "TouchDesigner connection verified",
			});
			return createSuccessResult(undefined);
		} catch (error) {
			this.transport = null;
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.sendLog({
				level: "critical",
				message: `Fatal error starting server! Check TouchDesigner setup and starting webserver. For detailed [setup instructions](https://github.com/8beeeaaat/touchdesigner-mcp). Details: ${err.message}`,
			});
			return createErrorResult(err);
		}
	}

	/**
	 * Disconnect from MCP transport
	 */
	async disconnect(): Promise<Result<void, Error>> {
		if (!this.isConnected()) {
			this.logger.sendLog({
				level: "debug",
				message: "disconnect: MCP server not connected",
			});
			return createSuccessResult(undefined);
		}

		try {
			await this.server.close();
			this.logger.sendLog({
				level: "debug",
				message: "disconnect: MCP server disconnected from MCP",
			});
			this.transport = null;
			return createSuccessResult(undefined);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logger.sendLog({
				level: "error",
				message: `disconnect: Error disconnecting from server: ${err.message}`,
			});
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
			level: "debug",
			message:
				"checkTDConnection: Testing connection to TouchDesigner server...",
		});
		try {
			const result = await this.performVersionCheck();
			return createSuccessResult(result.data);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(err);
		}
	}

	/**
	 * Check API version compatibility with TouchDesigner server
	 *
	 * This is called asynchronously during initialization to verify
	 * that the Python server component matches the expected API version.
	 * Logs warnings if versions are incompatible.
	 */
	private async performVersionCheck() {
		try {
			const info = await this.tdClient.getTdInfo();

			if (!info.success) {
				throw info.error;
			}

			const serverApiVersion = info.data.apiVersion;
			const checkResult = checkVersionCompatibility(serverApiVersion);

			if (checkResult.compatible) {
				this.logger.sendLog({
					level: "debug",
					message: `API version check passed: client=${checkResult.clientVersion}, server=${checkResult.serverVersion}`,
				});
				return info;
			}
			const warning = formatVersionWarning(checkResult);
			throw new Error(warning);
		} catch (err) {
			throw new Error(
				`Could not perform API version check - ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
}

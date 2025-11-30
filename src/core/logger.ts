import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LoggingMessageNotification } from "@modelcontextprotocol/sdk/types.js";

/**
 * Logger interface definition
 */
export interface ILogger {
	sendLog(args: LoggingMessageNotification["params"]): void;
}

/**
 * MCP compatible logger implementation
 * Handles "Not connected" errors gracefully
 */
export class McpLogger implements ILogger {
	constructor(private server: McpServer) {}

	sendLog(args: LoggingMessageNotification["params"]) {
		try {
			this.server.server.sendLoggingMessage({
				...args,
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Not connected") {
				return;
			}

			console.error(
				`Failed to send log to MCP server: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}

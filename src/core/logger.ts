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
			// Only swallow the expected "Not connected" error during startup/shutdown
			if (error instanceof Error && error.message === "Not connected") {
				return;
			}

			// For all other errors, log detailed information to help diagnose logging system failures
			console.error(
				"CRITICAL: Failed to send log to MCP server. Logging system may be compromised.",
				{
					error: error instanceof Error ? error.message : String(error),
					originalLogger: args.logger,
					originalLogLevel: args.level,
					stack: error instanceof Error ? error.stack : undefined,
				},
			);
		}
	}
}

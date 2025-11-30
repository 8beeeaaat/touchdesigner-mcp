import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LoggingLevel } from "@modelcontextprotocol/sdk/types.js";

/**
 * Logger interface definition
 */
export interface ILogger {
	sendLog({ level, message }: { level: LoggingLevel; message: string }): void;
}

/**
 * MCP compatible logger implementation
 * Handles "Not connected" errors gracefully
 */
export class McpLogger implements ILogger {
	constructor(private server: McpServer) {}
	public sendLog({ level, message }: { level: LoggingLevel; message: string }) {
		try {
			this.server.server.sendLoggingMessage({
				data: message,
				level,
			});
		} catch (error) {
			console.error("Failed to send log message to MCP server:", error);
		}
	}
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type logLevel = "info" | "debug" | "warning" | "error";

/**
 * Logger interface definition
 */
export interface ILogger {
	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	log(...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	debug(...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	warn(...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	error(...args: any[]): void;
}

/**
 * MCP compatible logger implementation
 * Handles "Not connected" errors gracefully
 */
export class McpLogger implements ILogger {
	constructor(private server: McpServer) {}

	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	public log(...args: any[]): void {
		this.sendLog("info", args);
	}

	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	public debug(...args: any[]): void {
		this.sendLog("debug", args);
	}

	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	public warn(...args: any[]): void {
		this.sendLog("warning", args);
	}

	// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
	public error(...args: any[]): void {
		this.sendLog("error", args);
	}

	private sendLog(
		level: logLevel,
		// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
		args: any[],
	): void {
		for (const arg of args) {
			try {
				const result = this.server.server.sendLoggingMessage({
					data: arg,
					level,
				});

				// Handle asynchronous errors as well
				if (result && typeof result.catch === "function") {
					result.catch((error) => {
						this.handleLogError(error, level, arg);
					});
				}
			} catch (error) {
				this.handleLogError(error, level, arg);
			}
		}
	}

	private handleLogError(
		error: unknown,
		level: logLevel,
		// biome-ignore lint/suspicious/noExplicitAny: logging accepts any type
		arg: any,
	): void {
		if (error instanceof Error && error.message === "Not connected") {
			return;
		}

		console.error(
			`Failed to send log to MCP server: ${error instanceof Error ? error.message : String(error)}`,
		);
		console[level === "warning" ? "warn" : level]?.(arg);
	}
}

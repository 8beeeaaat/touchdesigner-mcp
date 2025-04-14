import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ILogger {
	// biome-ignore lint/suspicious/noExplicitAny: logging
	log(...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: logging
	debug(...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: logging
	warn(...args: any[]): void;
	// biome-ignore lint/suspicious/noExplicitAny: logging
	error(...args: any[]): void;
}

export class Logger implements ILogger {
	constructor(private server: McpServer) {}

	// biome-ignore lint/suspicious/noExplicitAny: logging
	public log(...args: any[]): void {
		for (const arg of args) {
			this.server.server.sendLoggingMessage({
				level: "info",
				data: arg,
			});
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: logging
	public debug(...args: any[]): void {
		for (const arg of args) {
			this.server.server.sendLoggingMessage({
				level: "debug",
				data: arg,
			});
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: logging
	public warn(...args: any[]): void {
		for (const arg of args) {
			this.server.server.sendLoggingMessage({
				level: "warning",
				data: arg,
			});
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: logging
	public error(...args: any[]): void {
		for (const arg of args) {
			this.server.server.sendLoggingMessage({
				level: "error",
				data: arg,
			});
		}
	}
}

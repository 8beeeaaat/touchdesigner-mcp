import { inspect } from "node:util";

/**
 * Log severity levels (RFC 5424, matching MCP logging levels)
 */
export type LogLevel =
	| "debug"
	| "info"
	| "notice"
	| "warning"
	| "error"
	| "critical"
	| "alert"
	| "emergency";

/**
 * Parameters for a log entry
 */
export interface LogParams {
	level: LogLevel;
	data: unknown;
	logger?: string;
}

/**
 * Logger interface definition
 */
export interface ILogger {
	sendLog(args: LogParams): void;
}

/**
 * Console Logger implementation
 *
 * Outputs to stderr to avoid interfering with stdio transport.
 * The MCP logging capability is deprecated as of protocol revision 2026-07-28
 * (SEP-2577); stderr logging is the suggested migration path.
 */
export class ConsoleLogger implements ILogger {
	sendLog(args: LogParams) {
		const timestamp = new Date().toISOString();
		const level = args.level?.toUpperCase() || "INFO";
		const logger = args.logger || "unknown";
		const data =
			typeof args.data === "string"
				? args.data
				: inspect(args.data, {
						breakLength: Number.POSITIVE_INFINITY,
						compact: true,
						customInspect: false,
						depth: null,
					});

		console.error(`[${timestamp}] [${level}] [${logger}] ${data}`);
	}
}

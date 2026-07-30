/** Absolute path to the built CLI entry (requires `npm run build:dist`). */
export declare const CLI_PATH: string;
/** TouchDesigner connection args — E2E tests only exercise TD-independent surfaces. */
export declare const TD_ARGS: string[];
export declare function uniquePort(offset: number): number;
export declare function assertBuilt(): void;
export interface HttpServerHandle {
	port: number;
	/** Base URL, e.g. http://127.0.0.1:36400 */
	url: string;
	/** MCP endpoint URL */
	mcpUrl: string;
	stop(): Promise<void>;
}
/**
 * Spawn `dist/cli.js` in HTTP mode and wait until /health answers 200.
 */
export declare function startHttpServer(
	port: number,
): Promise<HttpServerHandle>;

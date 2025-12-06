import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";

/**
 * HTTP server state
 */
export type ServerState = "stopped" | "starting" | "running" | "stopping";

/**
 * Server status information
 */
export interface ServerStatus {
	/**
	 * Whether the server is currently running
	 */
	running: boolean;

	/**
	 * Current server state
	 */
	state: ServerState;

	/**
	 * Port the server is bound to (if running)
	 */
	port?: number;

	/**
	 * Host address the server is bound to (if running)
	 */
	host?: string;

	/**
	 * Server uptime in milliseconds (if running)
	 */
	uptime?: number;
}

/**
 * HTTP request handler
 */
export type RequestHandler = (
	req: IncomingMessage,
	res: ServerResponse,
) => void | Promise<void>;

/**
 * HTTP server configuration
 */
export interface HttpServerConfig {
	/**
	 * Port to bind the server to
	 */
	port: number;

	/**
	 * Host address to bind to (default: '127.0.0.1')
	 */
	host: string;

	/**
	 * Request handler for incoming HTTP requests
	 */
	requestHandler: RequestHandler;
}

/**
 * Manages HTTP server lifecycle for MCP Streamable HTTP transport
 *
 * This class provides:
 * - Server start/stop operations
 * - State management
 * - Graceful shutdown support
 * - Error handling
 */
export class HttpServerManager {
	private server: Server | null = null;
	private state: ServerState = "stopped";
	private config: HttpServerConfig | null = null;
	private startedAt: number | null = null;

	/**
	 * Get current server state
	 */
	getState(): ServerState {
		return this.state;
	}

	/**
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.state === "running";
	}

	/**
	 * Start the HTTP server
	 *
	 * @param config - Server configuration
	 * @returns Result with void on success or Error on failure
	 */
	async start(config: HttpServerConfig): Promise<Result<void, Error>> {
		if (this.state !== "stopped") {
			return createErrorResult(
				new Error(
					`Cannot start server: current state is ${this.state}, expected stopped`,
				),
			);
		}

		this.state = "starting";
		this.config = config;

		try {
			// Create HTTP server with request handler
			this.server = createServer((req, res) => {
				// Wrap async handler to catch errors
				Promise.resolve(config.requestHandler(req, res)).catch((error) => {
					console.error("Error handling request:", error);
					if (!res.headersSent) {
						res.writeHead(500, { "Content-Type": "text/plain" });
						res.end("Internal Server Error");
					}
				});
			});

			// Set up error handler
			this.server.on("error", (error) => {
				console.error("HTTP server error:", error);
			});

			// Start listening
			await new Promise<void>((resolve, reject) => {
				if (!this.server) {
					reject(new Error("Server instance is null"));
					return;
				}

				this.server.listen(config.port, config.host, () => {
					this.startedAt = Date.now();
					resolve();
				});

				this.server.on("error", reject);
			});

			this.state = "running";
			return createSuccessResult(undefined);
		} catch (error) {
			this.state = "stopped";
			this.server = null;
			this.config = null;
			this.startedAt = null;

			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Failed to start HTTP server: ${err.message}`),
			);
		}
	}

	/**
	 * Stop the HTTP server with graceful shutdown
	 *
	 * @param options - Shutdown options
	 * @returns Result with void on success or Error on failure
	 */
	async stop(options?: {
		/**
		 * Timeout in milliseconds for graceful shutdown (default: 5000)
		 */
		timeout?: number;
	}): Promise<Result<void, Error>> {
		if (this.state === "stopped") {
			return createSuccessResult(undefined);
		}

		if (this.state === "stopping") {
			return createErrorResult(
				new Error("Server is already in the process of stopping"),
			);
		}

		if (!this.server) {
			this.state = "stopped";
			return createSuccessResult(undefined);
		}

		this.state = "stopping";
		const timeout = options?.timeout ?? 5000;

		try {
			// Graceful shutdown: stop accepting new connections
			await new Promise<void>((resolve, reject) => {
				if (!this.server) {
					resolve();
					return;
				}

				const timeoutId = setTimeout(() => {
					reject(new Error(`Server shutdown timeout after ${timeout}ms`));
				}, timeout);

				this.server.close((error) => {
					clearTimeout(timeoutId);
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			this.server = null;
			this.config = null;
			this.state = "stopped";
			this.startedAt = null;

			return createSuccessResult(undefined);
		} catch (error) {
			// Force close if graceful shutdown failed
			if (this.server) {
				this.server.closeAllConnections?.();
				this.server = null;
			}

			this.config = null;
			this.state = "stopped";
			this.startedAt = null;

			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Error during server shutdown: ${err.message}`),
			);
		}
	}

	/**
	 * Get server address information
	 *
	 * @returns Server address or null if not running
	 */
	getAddress(): { host: string; port: number } | null {
		if (!this.server || this.state !== "running") {
			return null;
		}

		const address = this.server.address();
		if (!address || typeof address === "string") {
			return null;
		}

		return {
			host: address.address,
			port: address.port,
		};
	}

	/**
	 * Get current configuration
	 *
	 * @returns Server configuration or null if not configured
	 */
	getConfig(): HttpServerConfig | null {
		return this.config;
	}

	/**
	 * Get detailed server status
	 *
	 * @returns ServerStatus object with current server information
	 */
	getStatus(): ServerStatus {
		const address = this.getAddress();

		return {
			host: address?.host,
			port: address?.port,
			running: this.isRunning(),
			state: this.state,
			uptime:
				this.startedAt && this.isRunning()
					? Date.now() - this.startedAt
					: undefined,
		};
	}
}

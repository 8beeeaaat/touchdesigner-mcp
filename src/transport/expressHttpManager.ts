import type { Server as HttpServer } from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { RequestHandler } from "express";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type { StreamableHttpTransportConfig } from "./config.js";
import type { ISessionManager } from "./sessionManager.js";

/**
 * Type guard to check if transport has handleRequest method
 */
function isStreamableHTTPTransport(
	transport: unknown,
): transport is StreamableHTTPServerTransport {
	return (
		typeof transport === "object" &&
		transport !== null &&
		"handleRequest" in transport &&
		typeof transport.handleRequest === "function"
	);
}

/**
 * Express HTTP Manager
 *
 * Manages HTTP server lifecycle for Streamable HTTP transport using SDK's createMcpExpressApp.
 * Provides:
 * - /mcp endpoint → delegated to transport.handleRequest()
 * - /health endpoint → custom health check handler
 * - Session TTL cleanup integration
 * - Graceful shutdown
 *
 * @example
 * ```typescript
 * const manager = new ExpressHttpManager(
 *   config,
 *   transport,
 *   sessionManager,
 *   logger
 * );
 *
 * // Start server
 * const result = await manager.start();
 *
 * // Graceful shutdown
 * await manager.stop();
 * ```
 */
export class ExpressHttpManager {
	private readonly config: StreamableHttpTransportConfig;
	private readonly transport: StreamableHTTPServerTransport;
	private readonly sessionManager: ISessionManager | null;
	private readonly logger: ILogger;
	private server: HttpServer | null = null;

	constructor(
		config: StreamableHttpTransportConfig,
		transport: unknown,
		sessionManager: ISessionManager | null,
		logger: ILogger,
	) {
		if (!isStreamableHTTPTransport(transport)) {
			throw new Error(
				"Transport must be a StreamableHTTPServerTransport instance",
			);
		}

		this.config = config;
		this.transport = transport;
		this.sessionManager = sessionManager;
		this.logger = logger;
	}

	/**
	 * Start HTTP server with Express app from SDK
	 *
	 * @returns Result indicating success or failure
	 */
	async start(): Promise<Result<void, Error>> {
		try {
			if (this.server?.listening) {
				return createErrorResult(
					new Error("Express HTTP server is already running"),
				);
			}

			// Create Express app using SDK's factory
			// This automatically includes DNS rebinding protection for localhost
			const app = createMcpExpressApp({
				host: this.config.host,
			});

			const handleMcpRequest: RequestHandler = async (req, res) => {
				try {
					await this.transport.handleRequest(req, res, req.body);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					this.logger.sendLog({
						data: `Error handling MCP request: ${errorMessage}`,
						level: "error",
						logger: "ExpressHttpManager",
					});

					if (!res.headersSent) {
						res.status(500).json({
							error: "Internal server error",
						});
					}
				}
			};

			// Configure /mcp endpoints (POST for JSON-RPC, GET for SSE, DELETE for session close)
			app.post(this.config.endpoint, handleMcpRequest);
			app.get(this.config.endpoint, handleMcpRequest);
			app.delete(this.config.endpoint, handleMcpRequest);

			// Configure /health endpoint
			app.get("/health", (_req, res) => {
				// Explicitly check for null sessionManager - in HTTP mode this would indicate
				// a configuration error since session management should always be available
				if (!this.sessionManager) {
					res.status(500).json({
						message:
							"Session manager is not configured. This is a configuration error in HTTP mode.",
						sessions: null,
						status: "error",
						timestamp: new Date().toISOString(),
					});
					return;
				}
				const sessionCount = this.sessionManager.getActiveSessionCount();

				res.json({
					sessions: sessionCount,
					status: "ok",
					timestamp: new Date().toISOString(),
				});
			});

			// Start HTTP server
			await new Promise<void>((resolve, reject) => {
				try {
					this.server = app.listen(this.config.port, this.config.host, () => {
						this.logger.sendLog({
							data: `Express HTTP server listening on ${this.config.host}:${this.config.port}`,
							level: "info",
							logger: "ExpressHttpManager",
						});
						resolve();
					});

					this.server.on("error", (error) => {
						reject(error);
					});
				} catch (error) {
					reject(error);
				}
			});

			return createSuccessResult(undefined);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Failed to start Express HTTP server: ${err.message}`),
			);
		}
	}

	/**
	 * Graceful shutdown
	 *
	 * Stops HTTP server and cleans up resources.
	 *
	 * @returns Result indicating success or failure
	 */
	async stop(): Promise<Result<void, Error>> {
		try {
			if (!this.server) {
				return createSuccessResult(undefined);
			}

			// Close HTTP server
			await new Promise<void>((resolve, reject) => {
				this.server?.close((error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			this.logger.sendLog({
				data: "Express HTTP server stopped",
				level: "info",
				logger: "ExpressHttpManager",
			});

			this.server = null;

			return createSuccessResult(undefined);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Failed to stop Express HTTP server: ${err.message}`),
			);
		}
	}

	/**
	 * Check if server is running
	 *
	 * @returns True if server is running
	 */
	isRunning(): boolean {
		return this.server?.listening ?? false;
	}
}

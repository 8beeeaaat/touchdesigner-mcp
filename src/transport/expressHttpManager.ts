import type { Server as HttpServer } from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { McpHttpHandler, McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type { StreamableHttpTransportConfig } from "./config.js";

/**
 * Express HTTP Manager
 *
 * Manages HTTP server lifecycle for Streamable HTTP transport.
 *
 * Serving is stateless per protocol revision 2026-07-28: there are no
 * protocol-level sessions and no `Mcp-Session-Id` header. Every request is
 * answered by a fresh server instance from the factory via the SDK's
 * `createMcpHandler` entry, which speaks the 2026-07-28 revision and falls
 * back to stateless serving for 2025-era clients on the same endpoint.
 *
 * Key Features:
 * - /mcp endpoint → per-request stateless serving for both protocol eras
 * - /health endpoint → liveness check
 * - DNS rebinding protection → Host/Origin validation from the SDK Express app
 * - Graceful shutdown → closes open subscription streams, then the HTTP server
 *
 * @example
 * ```typescript
 * const manager = new ExpressHttpManager(
 *   config,
 *   () => TouchDesignerServer.create(), // Server factory
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
	private readonly serverFactory: () => McpServer;
	private readonly logger: ILogger;
	private handler: McpHttpHandler | null = null;
	private server: HttpServer | null = null;

	/**
	 * Create ExpressHttpManager with server factory
	 *
	 * @param config - Streamable HTTP transport configuration
	 * @param serverFactory - Factory function creating a new server instance per request
	 * @param logger - Logger instance
	 */
	constructor(
		config: StreamableHttpTransportConfig,
		serverFactory: () => McpServer,
		logger: ILogger,
	) {
		this.config = config;
		this.serverFactory = serverFactory;
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

			const logHandlerError = (error: Error) => {
				this.logger.sendLog({
					data: `Error handling MCP request: ${error.message}`,
					level: "error",
					logger: "ExpressHttpManager",
				});
			};

			// MCP handler serving the 2026-07-28 revision per request; 2025-era
			// (non-envelope) traffic is served through the stateless fallback.
			this.handler = createMcpHandler(() => this.serverFactory(), {
				onerror: logHandlerError,
			});

			// Create Express app using SDK's factory
			// This automatically includes DNS rebinding protection for localhost
			const app = createMcpExpressApp({
				host: this.config.host,
			});

			// The SDK Express app already parses JSON bodies; hand the parsed body
			// to the adapter so the request stream is not read twice.
			const nodeHandler = toNodeHandler(this.handler, {
				onerror: logHandlerError,
			});
			app.all(this.config.endpoint, (req, res) => {
				void nodeHandler(req, res, req.body);
			});

			// Configure /health endpoint
			app.get("/health", (_req, res) => {
				res.json({
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
						this.logger.sendLog({
							data: `MCP endpoint: ${this.config.endpoint}`,
							level: "info",
							logger: "ExpressHttpManager",
						});
						this.logger.sendLog({
							data: "Health check: GET /health",
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
	 * Closes the MCP handler (open subscription streams) and the HTTP server.
	 *
	 * @returns Result indicating success or failure
	 */
	async stop(): Promise<Result<void, Error>> {
		try {
			if (!this.server) {
				return createSuccessResult(undefined);
			}

			this.logger.sendLog({
				data: "Stopping Express HTTP server...",
				level: "info",
				logger: "ExpressHttpManager",
			});

			// Close the MCP handler first (ends open subscription streams)
			if (this.handler) {
				await this.handler.close();
				this.handler = null;
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

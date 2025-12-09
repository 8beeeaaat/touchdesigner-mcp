import type { Server as HttpServer } from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import express, { type RequestHandler } from "express";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type { StreamableHttpTransportConfig } from "./config.js";
import { TransportRegistry } from "./transportRegistry.js";

/**
 * Express HTTP Manager
 *
 * Manages HTTP server lifecycle for Streamable HTTP transport.
 * Handles multiple concurrent sessions by creating per-session transport and server instances.
 *
 * Key Features:
 * - /mcp endpoint → routes to appropriate transport via TransportRegistry
 * - /health endpoint → reports active session count
 * - Per-session isolation → each client gets independent MCP protocol state
 * - Graceful shutdown → cleans up all active sessions
 *
 * Architecture:
 * ```
 * Client 1 → POST /mcp → TransportRegistry.getOrCreate() → Transport 1 + Server 1
 * Client 2 → POST /mcp → TransportRegistry.getOrCreate() → Transport 2 + Server 2
 * ```
 *
 * @example
 * ```typescript
 * const manager = new ExpressHttpManager(
 *   config,
 *   () => TouchDesignerServer.create(), // Server factory
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
	private readonly serverFactory: () => McpServer;
	private readonly logger: ILogger;
	private readonly registry: TransportRegistry;
	private server: HttpServer | null = null;

	/**
	 * Create ExpressHttpManager with server factory
	 *
	 * @param config - Streamable HTTP transport configuration
	 * @param serverFactory - Factory function to create new Server instances per session
	 * @param sessionManager - Session manager for TTL tracking (optional)
	 * @param logger - Logger instance
	 */
	constructor(
		config: StreamableHttpTransportConfig,
		serverFactory: () => McpServer,
		sessionManager: import("./sessionManager.js").ISessionManager | null,
		logger: ILogger,
	) {
		this.config = config;
		this.serverFactory = serverFactory;
		this.logger = logger;
		this.registry = new TransportRegistry(config, sessionManager, logger);
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

			// MCP endpoint handler - routes to appropriate transport via registry
			const handleMcpRequest: RequestHandler = async (req, res) => {
				try {
					// Extract session ID from header
					const sessionId = req.headers["mcp-session-id"] as string | undefined;

					// Get or create transport for this session
					const transport = await this.registry.getOrCreate(
						sessionId,
						req.body,
						this.serverFactory,
					);

					if (!transport) {
						// Invalid session (session ID provided but not found, or non-initialize without session)
						res.status(400).json({
							error: {
								code: -32000,
								message: "Invalid session",
							},
							id: null,
							jsonrpc: "2.0",
						});
						return;
					}

					// Delegate request to transport
					await transport.handleRequest(req, res, req.body);
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

			// Configure /mcp endpoints
			// POST: JSON-RPC requests (initialize, tool calls, etc.)
			// GET: SSE streaming for notifications
			// DELETE: Session termination
			app.post(this.config.endpoint, handleMcpRequest);
			app.get(this.config.endpoint, handleMcpRequest);
			app.delete(this.config.endpoint, handleMcpRequest);

			// Configure /health endpoint
			app.get("/health", (_req, res) => {
				const sessionCount = this.registry.getCount();

				res.json({
					sessions: sessionCount,
					status: "ok",
					timestamp: new Date().toISOString(),
				});
			});

			// 🔬 Experiment: Static file serving for UI bundles
			app.use("/static", express.static("dist"));

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
						this.logger.sendLog({
							data: "Static files: GET /static/*",
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
	 * Stops HTTP server and cleans up all active sessions.
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

			// Cleanup all active sessions first
			const cleanupResult = await this.registry.cleanup();
			if (!cleanupResult.success) {
				this.logger.sendLog({
					data: `Warning: Session cleanup failed: ${cleanupResult.error.message}`,
					level: "warning",
					logger: "ExpressHttpManager",
				});
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

	/**
	 * Get active session count
	 *
	 * @returns Number of active sessions
	 */
	getActiveSessionCount(): number {
		return this.registry.getCount();
	}

	/**
	 * Get all active session IDs
	 *
	 * @returns Array of session IDs
	 */
	getActiveSessionIds(): string[] {
		return this.registry.getSessionIds();
	}
}

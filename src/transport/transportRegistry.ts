import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type { StreamableHttpTransportConfig } from "./config.js";
import type { ISessionManager } from "./sessionManager.js";

/**
 * Session entry containing transport and server instances
 */
interface SessionEntry {
	/**
	 * StreamableHTTPServerTransport instance for this session
	 */
	transport: StreamableHTTPServerTransport;

	/**
	 * MCP Server instance for this session
	 */
	server: McpServer;

	/**
	 * Timestamp when session was created (milliseconds since epoch)
	 */
	createdAt: number;
}

/**
 * Transport Registry
 *
 * Manages per-session transport and server instances for Streamable HTTP transport.
 * Each session gets its own isolated transport and server to maintain independent MCP protocol state.
 *
 * Key Responsibilities:
 * - Create new transport + server instances for new sessions
 * - Reuse existing transport for requests with valid session IDs
 * - Clean up sessions on close or expiration
 * - Track active session count for health checks
 *
 * @example
 * ```typescript
 * const registry = new TransportRegistry(config, sessionManager, logger);
 *
 * // In HTTP request handler
 * const transport = await registry.getOrCreate(
 *   sessionId,
 *   requestBody,
 *   () => createTouchDesignerServer()
 * );
 *
 * if (transport) {
 *   await transport.handleRequest(req, res, requestBody);
 * }
 *
 * // On shutdown
 * await registry.cleanup();
 * ```
 */
export class TransportRegistry {
	private readonly sessions: Map<string, SessionEntry> = new Map();
	private readonly config: StreamableHttpTransportConfig;
	private readonly sessionManager: ISessionManager | null;
	private readonly logger: ILogger;

	constructor(
		config: StreamableHttpTransportConfig,
		sessionManager: ISessionManager | null,
		logger: ILogger,
	) {
		this.config = config;
		this.sessionManager = sessionManager;
		this.logger = logger;
	}

	/**
	 * Get or create transport for a session
	 *
	 * Logic:
	 * 1. If sessionId exists and valid → return existing transport
	 * 2. If no sessionId and request is initialize → create new transport + server
	 * 3. Otherwise → return null (invalid session)
	 *
	 * @param sessionId - Session ID from mcp-session-id header (undefined for new sessions)
	 * @param requestBody - JSON-RPC request body
	 * @param serverFactory - Factory function to create new Server instances
	 * @returns Transport instance or null if session is invalid
	 */
	async getOrCreate(
		sessionId: string | undefined,
		requestBody: JSONRPCMessage,
		serverFactory: () => McpServer,
	): Promise<StreamableHTTPServerTransport | null> {
		// Case 1: Reuse existing session
		if (sessionId && this.sessions.has(sessionId)) {
			const entry = this.sessions.get(sessionId);
			if (entry) {
				this.logger.sendLog({
					data: `Reusing existing session: ${sessionId}`,
					level: "debug",
					logger: "TransportRegistry",
				});
				return entry.transport;
			}
		}

		// Case 2: Create new session (only for initialize requests without session ID)
		if (!sessionId && isInitializeRequest(requestBody)) {
			return await this.createSession(serverFactory);
		}

		// Case 3: Invalid session (session ID provided but not found, or non-initialize without session)
		this.logger.sendLog({
			data: `Invalid session request: sessionId=${sessionId}, isInitialize=${isInitializeRequest(requestBody)}`,
			level: "warning",
			logger: "TransportRegistry",
		});
		return null;
	}

	/**
	 * Create a new session with transport and server instances
	 *
	 * @param serverFactory - Factory function to create new Server instances
	 * @returns Transport instance for the new session
	 */
	private async createSession(
		serverFactory: () => McpServer,
	): Promise<StreamableHTTPServerTransport> {
		let transport: StreamableHTTPServerTransport | null = null;
		let server: McpServer | null = null;

		// Create transport with session lifecycle callbacks
		transport = new StreamableHTTPServerTransport({
			// Disable JSON responses (use SSE for streaming)
			enableJsonResponse: false,

			// Session close callback
			onsessionclosed: (sessionId: string) => {
				this.logger.sendLog({
					data: `Session closed: ${sessionId}`,
					level: "info",
					logger: "TransportRegistry",
				});

				// Remove from registry
				this.remove(sessionId);

				// Cleanup from SessionManager
				if (this.sessionManager) {
					this.sessionManager.cleanup(sessionId);
				}
			},

			// Session initialization callback
			onsessioninitialized: (sessionId: string) => {
				this.logger.sendLog({
					data: `Session initialized: ${sessionId}`,
					level: "info",
					logger: "TransportRegistry",
				});

				// Store session in registry
				if (transport && server) {
					this.sessions.set(sessionId, {
						createdAt: Date.now(),
						server,
						transport,
					});

					this.logger.sendLog({
						data: `Session stored in registry: ${sessionId} (total: ${this.sessions.size})`,
						level: "debug",
						logger: "TransportRegistry",
					});
				}

				// Register with SessionManager for TTL tracking
				if (this.sessionManager) {
					this.sessionManager.register(sessionId);
				}
			},

			// Retry interval for SSE
			retryInterval: this.config.retryInterval,

			// Session ID generator
			sessionIdGenerator: this.config.sessionConfig?.enabled
				? () => randomUUID()
				: undefined,
		});

		// Handle transport close event
		transport.onclose = () => {
			if (transport?.sessionId) {
				this.logger.sendLog({
					data: `Transport closed for session: ${transport.sessionId}`,
					level: "debug",
					logger: "TransportRegistry",
				});
				this.remove(transport.sessionId);
			}
		};

		// Create server instance
		server = serverFactory();

		// Connect server to transport
		await server.connect(transport);

		this.logger.sendLog({
			data: "Created new session (session ID will be assigned after initialize)",
			level: "info",
			logger: "TransportRegistry",
		});

		return transport;
	}

	/**
	 * Remove session from registry
	 *
	 * @param sessionId - Session ID to remove
	 */
	remove(sessionId: string): void {
		const entry = this.sessions.get(sessionId);
		if (entry) {
			this.sessions.delete(sessionId);
			this.logger.sendLog({
				data: `Session removed from registry: ${sessionId} (remaining: ${this.sessions.size})`,
				level: "info",
				logger: "TransportRegistry",
			});
		}
	}

	/**
	 * Get number of active sessions
	 *
	 * @returns Active session count
	 */
	getCount(): number {
		return this.sessions.size;
	}

	/**
	 * Get all session IDs
	 *
	 * @returns Array of session IDs
	 */
	getSessionIds(): string[] {
		return Array.from(this.sessions.keys());
	}

	/**
	 * Cleanup all sessions
	 *
	 * Called during graceful shutdown to close all active sessions
	 *
	 * @returns Result indicating success or failure
	 */
	async cleanup(): Promise<Result<void, Error>> {
		try {
			this.logger.sendLog({
				data: `Cleaning up ${this.sessions.size} active session(s)`,
				level: "info",
				logger: "TransportRegistry",
			});

			const closePromises: Promise<void>[] = [];

			for (const [sessionId, entry] of this.sessions.entries()) {
				try {
					// Close transport (this will trigger onsessionclosed callback)
					closePromises.push(entry.transport.close());
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.logger.sendLog({
						data: `Error closing session ${sessionId}: ${err.message}`,
						level: "error",
						logger: "TransportRegistry",
					});
				}
			}

			// Wait for all transports to close
			await Promise.all(closePromises);

			// Clear the map (should already be empty due to onsessionclosed callbacks)
			this.sessions.clear();

			this.logger.sendLog({
				data: "All sessions cleaned up",
				level: "info",
				logger: "TransportRegistry",
			});

			return createSuccessResult(undefined);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Failed to cleanup sessions: ${err.message}`),
			);
		}
	}
}

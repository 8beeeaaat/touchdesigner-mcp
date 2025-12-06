import type { IncomingMessage, ServerResponse } from "node:http";
import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createSuccessResult } from "../core/result.js";
import type { StreamableHttpTransportConfig } from "./config.js";
import { HttpServerManager } from "./httpServerManager.js";
import type { ISessionManager } from "./sessionManager.js";

/**
 * HTTP Transport Manager
 *
 * Manages the full lifecycle of HTTP-based MCP transport, including:
 * - HTTP server management
 * - Transport instance management per session
 * - Endpoint routing (/mcp, /health)
 * - Session coordination
 *
 * This class bridges HttpServerManager (HTTP layer) and StreamableHTTPServerTransport (MCP layer).
 */
export class HttpTransportManager {
	private readonly config: StreamableHttpTransportConfig;
	private readonly httpServer: HttpServerManager;
	private readonly sessionManager: ISessionManager | null;
	private readonly logger: ILogger;
	private readonly transports: Map<string, StreamableHTTPServerTransport> =
		new Map();
	private readonly transportFactory: () => Result<Transport, Error>;

	constructor(
		config: StreamableHttpTransportConfig,
		transportFactory: () => Result<Transport, Error>,
		sessionManager: ISessionManager | null,
		logger: ILogger,
	) {
		this.config = config;
		this.transportFactory = transportFactory;
		this.sessionManager = sessionManager;
		this.logger = logger;

		// Create HTTP server with request handler
		this.httpServer = new HttpServerManager();
	}

	/**
	 * Start the HTTP transport manager
	 *
	 * This starts the HTTP server and begins accepting MCP requests.
	 */
	async start(): Promise<Result<void, Error>> {
		const result = await this.httpServer.start({
			host: this.config.host,
			port: this.config.port,
			requestHandler: (req, res) => this.handleHttpRequest(req, res),
		});

		if (!result.success) {
			return result;
		}

		this.logger.sendLog({
			data: `HTTP Transport Manager started on ${this.config.host}:${this.config.port}`,
			level: "info",
			logger: "HttpTransportManager",
		});

		return createSuccessResult(undefined);
	}

	/**
	 * Stop the HTTP transport manager
	 *
	 * Gracefully shuts down all transports and the HTTP server.
	 */
	async stop(): Promise<Result<void, Error>> {
		// Close all active transports
		for (const [sessionId, transport] of this.transports.entries()) {
			try {
				this.logger.sendLog({
					data: `Closing transport for session: ${sessionId}`,
					level: "info",
					logger: "HttpTransportManager",
				});
				await transport.close();
				this.transports.delete(sessionId);
			} catch (error) {
				this.logger.sendLog({
					data: `Error closing transport for session ${sessionId}: ${error}`,
					level: "error",
					logger: "HttpTransportManager",
				});
			}
		}

		// Stop HTTP server
		const result = await this.httpServer.stop();
		if (!result.success) {
			return result;
		}

		this.logger.sendLog({
			data: "HTTP Transport Manager stopped",
			level: "info",
			logger: "HttpTransportManager",
		});

		return createSuccessResult(undefined);
	}

	/**
	 * Handle incoming HTTP requests
	 *
	 * Routes requests to appropriate handlers based on path and method.
	 */
	private async handleHttpRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const url = new URL(req.url || "/", `http://${req.headers.host}`);

		// Route based on path
		if (url.pathname === "/health") {
			return this.handleHealthCheck(req, res);
		}

		if (url.pathname === this.config.endpoint) {
			return this.handleMcpRequest(req, res);
		}

		// Unknown endpoint
		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Not Found");
	}

	/**
	 * Handle /health endpoint
	 *
	 * Returns server health status and basic metrics.
	 */
	private handleHealthCheck(_req: IncomingMessage, res: ServerResponse): void {
		const status = this.httpServer.getStatus();
		const healthData = {
			activeSessions: this.transports.size,
			running: status.running,
			serverState: status.state,
			status: status.running ? "healthy" : "unhealthy",
			timestamp: new Date().toISOString(),
			uptime: status.uptime,
		};

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(healthData, null, 2));
	}

	/**
	 * Handle MCP requests (POST, GET, DELETE)
	 *
	 * Delegates to appropriate handler based on HTTP method.
	 */
	private async handleMcpRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		switch (req.method) {
			case "POST":
				return this.handlePostRequest(req, res);
			case "GET":
				return this.handleGetRequest(req, res);
			case "DELETE":
				return this.handleDeleteRequest(req, res);
			default:
				res.writeHead(405, { "Content-Type": "text/plain" });
				res.end("Method Not Allowed");
		}
	}

	/**
	 * Handle POST requests (JSON-RPC messages)
	 */
	private async handlePostRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		// Parse request body
		const body = await this.parseRequestBody(req);
		if (!body) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					error: { code: -32700, message: "Parse error" },
					id: null,
					jsonrpc: "2.0",
				}),
			);
			return;
		}

		const sessionId = req.headers["mcp-session-id"] as string | undefined;

		// Handle existing session
		if (sessionId) {
			const transport = this.transports.get(sessionId);
			if (!transport) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						error: { code: -32000, message: "Invalid session ID" },
						id: null,
						jsonrpc: "2.0",
					}),
				);
				return;
			}

			// Validate session if session manager is available
			if (this.sessionManager) {
				const validationResult = this.sessionManager.validate(sessionId);
				if (!validationResult.success) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							error: { code: -32000, message: "Session expired" },
							id: null,
							jsonrpc: "2.0",
						}),
					);
					return;
				}
			}

			await transport.handleRequest(req, res, body);
			return;
		}

		// Handle new initialization request
		if (isInitializeRequest(body)) {
			const transportResult = this.transportFactory();
			if (!transportResult.success) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						error: {
							code: -32603,
							message: `Failed to create transport: ${transportResult.error.message}`,
						},
						id: null,
						jsonrpc: "2.0",
					}),
				);
				return;
			}

			const transport = transportResult.data as StreamableHTTPServerTransport;

			// Set up transport event handlers
			transport.onclose = () => {
				const sid = transport.sessionId;
				if (sid && this.transports.has(sid)) {
					this.logger.sendLog({
						data: `Transport closed for session: ${sid}`,
						level: "info",
						logger: "HttpTransportManager",
					});
					this.transports.delete(sid);

					// Clean up session if session manager is available
					if (this.sessionManager) {
						this.sessionManager.cleanup(sid);
					}
				}
			};

			// Handle the initialization request
			await transport.handleRequest(req, res, body);

			// Store transport by session ID after handling (session ID is set during handleRequest)
			if (transport.sessionId) {
				this.transports.set(transport.sessionId, transport);

				// Create session in session manager if available
				if (this.sessionManager) {
					this.sessionManager.create({ transportType: "streamable-http" });
				}
			}

			return;
		}

		// Invalid request: not initialization and no session ID
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				error: { code: -32000, message: "No valid session ID provided" },
				id: null,
				jsonrpc: "2.0",
			}),
		);
	}

	/**
	 * Handle GET requests (SSE streams)
	 */
	private async handleGetRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const sessionId = req.headers["mcp-session-id"] as string | undefined;

		if (!sessionId) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Missing session ID");
			return;
		}

		const transport = this.transports.get(sessionId);
		if (!transport) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid session ID");
			return;
		}

		// Validate session if session manager is available
		if (this.sessionManager) {
			const validationResult = this.sessionManager.validate(sessionId);
			if (!validationResult.success) {
				res.writeHead(400, { "Content-Type": "text/plain" });
				res.end("Session expired");
				return;
			}
		}

		const lastEventId = req.headers["last-event-id"] as string | undefined;
		if (lastEventId) {
			this.logger.sendLog({
				data: `Client reconnecting with Last-Event-ID: ${lastEventId}`,
				level: "info",
				logger: "HttpTransportManager",
			});
		}

		await transport.handleRequest(req, res);
	}

	/**
	 * Handle DELETE requests (session termination)
	 */
	private async handleDeleteRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const sessionId = req.headers["mcp-session-id"] as string | undefined;

		if (!sessionId) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Missing session ID");
			return;
		}

		const transport = this.transports.get(sessionId);
		if (!transport) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid session ID");
			return;
		}

		this.logger.sendLog({
			data: `Session termination requested: ${sessionId}`,
			level: "info",
			logger: "HttpTransportManager",
		});

		await transport.handleRequest(req, res);

		// Clean up transport and session
		this.transports.delete(sessionId);
		if (this.sessionManager) {
			this.sessionManager.cleanup(sessionId);
		}
	}

	/**
	 * Parse JSON request body
	 */
	private async parseRequestBody(
		req: IncomingMessage,
	): Promise<unknown | null> {
		return new Promise((resolve) => {
			const chunks: Buffer[] = [];
			req.on("data", (chunk: Buffer) => chunks.push(chunk));
			req.on("end", () => {
				try {
					const body = Buffer.concat(chunks).toString("utf-8");
					resolve(JSON.parse(body));
				} catch {
					resolve(null);
				}
			});
			req.on("error", () => resolve(null));
		});
	}

	/**
	 * Get number of active transports
	 */
	getActiveTransportCount(): number {
		return this.transports.size;
	}

	/**
	 * Get server status
	 */
	getStatus() {
		return {
			activeTransports: this.transports.size,
			httpServer: this.httpServer.getStatus(),
		};
	}
}

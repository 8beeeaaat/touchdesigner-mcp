import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { randomUUID } from "node:crypto";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type {
	StdioTransportConfig,
	StreamableHttpTransportConfig,
	TransportConfig,
} from "./config.js";
import { isStreamableHttpTransportConfig } from "./config.js";
import type { ISessionManager } from "./sessionManager.js";
import { TransportConfigValidator } from "./validator.js";

/**
 * Factory for creating MCP transport instances based on configuration
 *
 * This factory implements the Factory pattern to encapsulate transport creation logic.
 * It validates configuration and creates the appropriate transport type (stdio or HTTP).
 */
export class TransportFactory {
	/**
	 * Reset the internal state of a StreamableHTTPServerTransport instance
	 *
	 * WARNING: This method manipulates the private field '_initialized' using Reflect.set().
	 * This is fragile and may break if the MCP SDK implementation changes.
	 * There is currently no public API to reset the initialized state, so this is required
	 * to ensure the transport can be reused safely after a session is closed.
	 * If the SDK adds a public reset/init method, use that instead.
	 * If the SDK changes the field name or its semantics, update this code accordingly.
	 */
	private static resetStreamableHttpState(
		transport: StreamableHTTPServerTransport,
	): void {
		transport.sessionId = undefined;
		Reflect.set(transport, "_initialized", false);
	}
	/**
	 * Create a transport instance from configuration
	 *
	 * @param config - Transport configuration (stdio or streamable-http)
	 * @param logger - Optional logger for HTTP transport session events (ignored for stdio)
	 * @param sessionManager - Optional session manager for HTTP transport (ignored for stdio)
	 * @returns Result with Transport instance or Error
	 *
	 * @example
	 * ```typescript
	 * // Create stdio transport
	 * const stdioResult = TransportFactory.create({ type: 'stdio' });
	 *
	 * // Create HTTP transport with logger and session manager
	 * const httpResult = TransportFactory.create({
	 *   type: 'streamable-http',
	 *   port: 6280,
	 *   host: '127.0.0.1',
	 *   endpoint: '/mcp'
	 * }, logger, sessionManager);
	 * ```
	 */
	static create(
		config: TransportConfig,
		logger?: ILogger,
		sessionManager?: ISessionManager | null,
	): Result<Transport, Error> {
		// Validate configuration first
		const validationResult = TransportConfigValidator.validate(config);
		if (!validationResult.success) {
			return validationResult;
		}

		const validatedConfig = validationResult.data;

		// Dispatch to appropriate factory method based on type
		if (isStreamableHttpTransportConfig(validatedConfig)) {
			return TransportFactory.createStreamableHttp(
				validatedConfig,
				logger,
				sessionManager,
			);
		}

		return TransportFactory.createStdio(validatedConfig);
	}

	/**
	 * Create a stdio transport instance
	 *
	 * @param _config - Stdio transport configuration (unused, kept for API consistency)
	 * @returns Result with StdioServerTransport instance
	 */
	private static createStdio(
		_config: StdioTransportConfig,
	): Result<Transport, Error> {
		try {
			const transport = new StdioServerTransport();
			return createSuccessResult(transport);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Failed to create stdio transport: ${err.message}`),
			);
		}
	}

	/**
	 * Create a streamable HTTP transport instance
	 *
	 * Creates a StreamableHTTPServerTransport with session management support.
	 * The transport instance is stateful and manages session lifecycle through callbacks.
	 *
	 * Note: DNS rebinding protection is handled by Express middleware (createMcpExpressApp)
	 * in the ExpressHttpManager, not by the transport itself.
	 *
	 * @param config - Streamable HTTP transport configuration
	 * @param logger - Optional logger for session lifecycle events
	 * @param sessionManager - Optional session manager for tracking sessions
	 * @returns Result with StreamableHTTPServerTransport instance or Error
	 *
	 * @example
	 * ```typescript
	 * const config: StreamableHttpTransportConfig = {
	 *   type: 'streamable-http',
	 *   port: 6280,
	 *   host: '127.0.0.1',
	 *   endpoint: '/mcp',
	 *   sessionConfig: { enabled: true }
	 * };
	 * const result = TransportFactory.createStreamableHttp(config, logger, sessionManager);
	 * ```
	 */
	private static createStreamableHttp(
		config: StreamableHttpTransportConfig,
		logger?: ILogger,
		sessionManager?: ISessionManager | null,
	): Result<Transport, Error> {
		try {
			let transport: StreamableHTTPServerTransport | null = null;
			let suppressCloseEvent = false;
			const handleSessionClosed = config.sessionConfig?.enabled
				? (sessionId: string) => {
					if (logger) {
						logger.sendLog({
							data: `Session closed: ${sessionId}`,
							level: "info",
							logger: "TransportFactory",
						});
					}
					// Clean up session from SessionManager
					if (sessionManager) {
						sessionManager.cleanup(sessionId);
					}
					suppressCloseEvent = true;
					if (transport) {
						TransportFactory.resetStreamableHttpState(transport);
					}
				}
				: undefined;
			// Create transport with session management only
			// Security (DNS rebinding protection) is handled by Express middleware
			transport = new StreamableHTTPServerTransport({
				// Enable JSON responses for simple request/response scenarios
				enableJsonResponse: false,

				// Session close callback
				// This is called when a session is terminated via DELETE request
				onsessionclosed: handleSessionClosed,

				// Session initialization callback
				// This is called when a new session is created
				onsessioninitialized: config.sessionConfig?.enabled
					? (sessionId: string) => {
						if (logger) {
							logger.sendLog({
								data: `Session initialized: ${sessionId}`,
								level: "info",
								logger: "TransportFactory",
							});
						}
						// Register session with SessionManager
						if (sessionManager) {
							sessionManager.register(sessionId);
						}
					}
					: undefined,

				// Retry interval for SSE polling behavior (optional)
				retryInterval: config.retryInterval,

				// Use randomUUID for session ID generation if sessions are enabled
				sessionIdGenerator: config.sessionConfig?.enabled
					? () => randomUUID()
					: undefined,
			});

			// Override the transport's close method to handle session cleanup scenarios.
			//
			// Why suppressCloseEvent is necessary:
			// When a session is explicitly closed (via DELETE request), the SDK calls onsessionclosed
			// which triggers our handleSessionClosed callback. We need to reset the transport state
			// without triggering the onclose callback, which would signal a transport-level disconnection.
			//
			// Scenarios that trigger this code path:
			// 1. Client sends DELETE request to close session → onsessionclosed fires → suppressCloseEvent = true
			// 2. Session TTL expires → cleanup triggers close → suppressCloseEvent = true
			//
			// Relationship between suppressCloseEvent and handleSessionClosed:
			// - handleSessionClosed sets suppressCloseEvent = true to indicate a session-level (not transport-level) close
			// - When close() is called with suppressCloseEvent = true, we temporarily remove onclose callback
			// - This prevents the MCP server from treating session cleanup as a transport disconnection
			const originalClose = transport.close.bind(transport);
			transport.close = (async () => {
				if (suppressCloseEvent) {
					const previousOnClose = transport?.onclose;
					transport.onclose = undefined;
					try {
						await originalClose();
					} finally {
						transport.onclose = previousOnClose;
						suppressCloseEvent = false;
					}
					return;
				}
				await originalClose();
			}) as typeof transport.close;

			return createSuccessResult(transport);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Failed to create streamable HTTP transport: ${err.message}`),
			);
		}
	}
}

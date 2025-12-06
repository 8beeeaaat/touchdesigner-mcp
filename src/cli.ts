#!/usr/bin/env node

import { McpLogger } from "./core/logger.js";
import { TouchDesignerServer } from "./server/touchDesignerServer.js";
import type {
	StreamableHttpTransportConfig,
	TransportConfig,
} from "./transport/config.js";
import { isStreamableHttpTransportConfig } from "./transport/config.js";
import { ExpressHttpManager } from "./transport/expressHttpManager.js";
import { TransportFactory } from "./transport/factory.js";
import { SessionManager } from "./transport/sessionManager.js";

// Note: Environment variables should be set by the MCP Bundle runtime or CLI arguments

const DEFAULT_HOST = "http://127.0.0.1";
const DEFAULT_PORT = 9981;
const DEFAULT_MCP_ENDPOINT = "/mcp";

/**
 * Parse command line arguments for TouchDesigner connection
 */
export function parseArgs(args?: string[]) {
	const argsToProcess = args || process.argv.slice(2);
	const parsed = {
		host: DEFAULT_HOST,
		port: DEFAULT_PORT,
	};

	for (let i = 0; i < argsToProcess.length; i++) {
		const arg = argsToProcess[i];
		if (arg.startsWith("--host=")) {
			parsed.host = arg.split("=")[1];
		} else if (arg.startsWith("--port=")) {
			parsed.port = Number.parseInt(arg.split("=")[1], 10);
		}
	}

	return parsed;
}

/**
 * Parse transport configuration from command line arguments
 *
 * Detects if HTTP mode is requested via --mcp-http-port flag.
 * If not specified, defaults to stdio mode.
 *
 * @param args - Command line arguments (defaults to process.argv.slice(2))
 * @returns Transport configuration (stdio or streamable-http)
 *
 * @example
 * ```bash
 * # Stdio mode (default)
 * touchdesigner-mcp-server --host=http://localhost --port=9981
 *
 * # HTTP mode
 * touchdesigner-mcp-server --mcp-http-port=3000 --mcp-http-host=127.0.0.1
 * ```
 */
export function parseTransportConfig(args?: string[]): TransportConfig {
	const argsToProcess = args || process.argv.slice(2);

	// Check for HTTP mode
	const httpPortArg = argsToProcess.find((arg) =>
		arg.startsWith("--mcp-http-port="),
	);

	if (httpPortArg) {
		const port = Number.parseInt(httpPortArg.split("=")[1], 10);
		const hostArg = argsToProcess.find((arg) =>
			arg.startsWith("--mcp-http-host="),
		);
		const host = hostArg ? hostArg.split("=")[1] : "127.0.0.1";

		const config: StreamableHttpTransportConfig = {
			endpoint: DEFAULT_MCP_ENDPOINT,
			host,
			port,
			sessionConfig: { enabled: true },
			type: "streamable-http",
		};

		return config;
	}

	// Default to stdio mode
	return { type: "stdio" };
}

/**
 * Start TouchDesigner MCP server
 *
 * Supports both stdio and HTTP transport modes based on command line arguments.
 *
 * @param params - Server startup parameters
 * @param params.argv - Command line arguments
 * @param params.nodeEnv - Node environment
 *
 * @example
 * ```bash
 * # Stdio mode (default)
 * touchdesigner-mcp-server --host=http://localhost --port=9981
 *
 * # HTTP mode
 * touchdesigner-mcp-server --mcp-http-port=3000 --host=http://localhost --port=9981
 * ```
 */
export async function startServer(params?: {
	nodeEnv?: string;
	argv?: string[];
}): Promise<void> {
	try {
		// Parse transport configuration
		const transportConfig = parseTransportConfig(params?.argv);

		// Parse TouchDesigner connection arguments
		const args = parseArgs(params?.argv);
		process.env.TD_WEB_SERVER_HOST = args.host;
		process.env.TD_WEB_SERVER_PORT = args.port.toString();

		// Create MCP server
		const server = new TouchDesignerServer();

		// Handle stdio mode
		if (transportConfig.type === "stdio") {
			const transportResult = TransportFactory.create(transportConfig);
			if (!transportResult.success) {
				throw transportResult.error;
			}

			const result = await server.connect(transportResult.data);
			if (!result.success) {
				throw new Error(`Failed to connect: ${result.error.message}`);
			}

			console.error("MCP server started in stdio mode");
			return;
		}

		// Handle HTTP mode
		if (isStreamableHttpTransportConfig(transportConfig)) {
			const logger = new McpLogger(server.server);

			// Create session manager if enabled
			const sessionManager = transportConfig.sessionConfig?.enabled
				? new SessionManager(transportConfig.sessionConfig, logger)
				: null;

			// Create transport instance with logger and session manager for session lifecycle events
			const transportResult = TransportFactory.create(
				transportConfig,
				logger,
				sessionManager,
			);
			if (!transportResult.success) {
				throw transportResult.error;
			}
			const transport = transportResult.data;

			// Connect server to transport
			const connectResult = await server.connect(transport);
			if (!connectResult.success) {
				throw new Error(`Failed to connect: ${connectResult.error.message}`);
			}

			// Create Express HTTP manager
			const httpManager = new ExpressHttpManager(
				transportConfig,
				transport,
				sessionManager,
				logger,
			);

			// Start HTTP server
			const startResult = await httpManager.start();
			if (!startResult.success) {
				throw startResult.error;
			}

			console.error(
				`MCP server started in HTTP mode on ${transportConfig.host}:${transportConfig.port}${transportConfig.endpoint}`,
			);

			// Start session cleanup if enabled
			if (sessionManager) {
				sessionManager.startTTLCleanup();
			}

			// Set up graceful shutdown
			const shutdown = async () => {
				console.error("\nShutting down server...");

				// Stop session cleanup
				if (sessionManager) {
					sessionManager.stopTTLCleanup();
				}

				// Stop HTTP server
				const stopResult = await httpManager.stop();
				if (!stopResult.success) {
					console.error(`Error during shutdown: ${stopResult.error.message}`);
				}

				// Close transport
				await transport.close();

				console.error("Server shutdown complete");
				process.exit(0);
			};

			process.on("SIGINT", shutdown);
			process.on("SIGTERM", shutdown);

			return;
		}

		throw new Error(
			`Unsupported transport type: ${(transportConfig as TransportConfig).type}`,
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to initialize server: ${errorMessage}`);
	}
}

// Start server if this file is executed directly
startServer({
	argv: process.argv,
	nodeEnv: process.env.NODE_ENV,
}).catch((error) => {
	console.error("Failed to start server:", error);
	if (process.env.NODE_ENV === "test") return;
	process.exit(1);
});

#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { ConsoleLogger } from "./core/logger.js";
import { TouchDesignerServer } from "./server/touchDesignerServer.js";
import { createTouchDesignerClient } from "./tdClient/index.js";
import type {
	StreamableHttpTransportConfig,
	TransportConfig,
} from "./transport/config.js";
import { isStreamableHttpTransportConfig } from "./transport/config.js";
import { ExpressHttpManager } from "./transport/expressHttpManager.js";

// Note: Environment variables should be set by the MCP Bundle runtime or CLI arguments

const DEFAULT_HOST = "http://127.0.0.1";
const DEFAULT_PORT = 9981;
const DEFAULT_MCP_ENDPOINT = "/mcp";

/** Every flag the CLI acts on, across parseArgs and parseTransportConfig. */
const RECOGNIZED_FLAGS = [
	"--host=",
	"--port=",
	"--mcp-http-host=",
	"--mcp-http-port=",
];

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
			const portStr = arg.split("=")[1];
			const port = Number.parseInt(portStr, 10);
			if (Number.isNaN(port) || port < 1 || port > 65535) {
				console.error(
					`Invalid value for --port: "${portStr}". Please specify a valid port number (1-65535).`,
				);
				process.exit(1);
			}
			parsed.port = port;
		} else if (
			arg.startsWith("--") &&
			!RECOGNIZED_FLAGS.some((flag) => arg.startsWith(flag))
		) {
			// Unrecognized flags used to be discarded in silence, so a typo like
			// --prot=9981 connected to the default port with no hint that the
			// requested one had been ignored.
			console.error(`Warning: ignoring unrecognized argument "${arg}".`);
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
 * touchdesigner-mcp-server --mcp-http-port=6280 --mcp-http-host=127.0.0.1
 * ```
 */
export function parseTransportConfig(args?: string[]): TransportConfig {
	const argsToProcess = args || process.argv.slice(2);

	// Check for HTTP mode
	const httpPortArg = argsToProcess.find((arg) =>
		arg.startsWith("--mcp-http-port="),
	);

	if (httpPortArg) {
		const portStr = httpPortArg.split("=")[1];
		const port = Number.parseInt(portStr, 10);
		if (Number.isNaN(port) || port < 1 || port > 65535) {
			console.error(
				`Invalid value for --mcp-http-port: "${portStr}". Please specify a valid port number (1-65535).`,
			);
			process.exit(1);
		}
		const hostArg = argsToProcess.find((arg) =>
			arg.startsWith("--mcp-http-host="),
		);
		const host = hostArg ? hostArg.split("=")[1] : "127.0.0.1";

		const config: StreamableHttpTransportConfig = {
			endpoint: DEFAULT_MCP_ENDPOINT,
			host,
			port,
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
 * Both modes serve protocol revision 2026-07-28 and fall back to the 2025-era
 * protocol for older clients.
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
 * touchdesigner-mcp-server --mcp-http-port=6280 --host=http://localhost --port=9981
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

		// Handle stdio mode
		if (transportConfig.type === "stdio") {
			// serveStdio owns the protocol-era decision for the connection:
			// the opening exchange selects 2026-07-28 or the legacy handshake,
			// and one instance from the factory is pinned for the connection.
			serveStdio(() => TouchDesignerServer.create());

			console.error("MCP server started in stdio mode");
			return;
		}

		// Handle HTTP mode
		if (isStreamableHttpTransportConfig(transportConfig)) {
			const logger = new ConsoleLogger();
			const tdClient = createTouchDesignerClient({ logger });

			// MCP server state is request-scoped, while the TouchDesigner client
			// retains compatibility results across requests for their configured TTL.
			const serverFactory = () => TouchDesignerServer.create({ tdClient });

			// Create Express HTTP manager with server factory
			const httpManager = new ExpressHttpManager(
				transportConfig,
				serverFactory,
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

			// Set up graceful shutdown
			const shutdown = async () => {
				console.error("\nShutting down server...");

				// Stop HTTP server
				const stopResult = await httpManager.stop();
				if (!stopResult.success) {
					console.error(`Error during shutdown: ${stopResult.error.message}`);
				}

				console.error("Server shutdown complete");
				process.exit(0);
			};

			process.on("SIGINT", shutdown);
			process.on("SIGTERM", shutdown);

			return;
		}

		// Type-safe exhaustive check using never type
		// This ensures all cases of the TransportConfig discriminated union are handled
		// If a new transport type is added, TypeScript will error at compile time
		assertNever(transportConfig);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to initialize server: ${errorMessage}`);
	}
}

/**
 * Helper function for exhaustive type checking
 * TypeScript will error if called with a non-never type, ensuring all cases are handled
 */
function assertNever(value: never): never {
	throw new Error(
		`Unsupported transport type: ${(value as { type: string }).type}`,
	);
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

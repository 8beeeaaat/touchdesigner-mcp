#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TouchDesignerServer } from "./server/touchDesignerServer.js";

// Note: Environment variables should be set by the Desktop Extensions runtime or CLI arguments

/**
 * Parse command line arguments
 */
export function parseArgs(args?: string[]) {
	const argsToProcess = args || process.argv.slice(2);
	const parsed = {
		host: "http://127.0.0.1",
		port: 9981,
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
 * Determine if the server should run in stdio mode
 */
export function isStdioMode(nodeEnv?: string, argv?: string[]): boolean {
	const env = nodeEnv ?? process.env.NODE_ENV;
	const args = argv ?? process.argv;

	return env === "cli" || args.includes("--stdio");
}

/**
 * Start TouchDesigner MCP server
 */
export async function startServer(params?: {
	nodeEnv?: string;
	argv?: string[];
}): Promise<void> {
	try {
		const isStdioModeFlag = isStdioMode(params?.nodeEnv, params?.argv);
		if (!isStdioModeFlag) {
			throw new Error(
				"Sorry, this server is not yet available in the browser. Please use the CLI mode.",
			);
		}

		// Parse command line arguments and set environment variables
		const args = parseArgs(params?.argv);
		process.env.TD_WEB_SERVER_HOST = args.host;
		process.env.TD_WEB_SERVER_PORT = args.port.toString();

		const server = new TouchDesignerServer();
		const transport = new StdioServerTransport();
		const result = await server.connect(transport);

		if (!result.success) {
			throw new Error(`Failed to connect: ${result.error.message}`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to initialize server: ${errorMessage}`);
	}
}

// Start server if this file is executed directly
startServer({
	nodeEnv: process.env.NODE_ENV,
	argv: process.argv,
}).catch((error) => {
	console.error("Failed to start server:", error);
	if (process.env.NODE_ENV === "test") return;
	process.exit(1);
});

#!/usr/bin/env node

import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { TouchDesignerServer } from "./server/touchDesignerServer.js";

config({ path: resolve(process.cwd(), ".env") });

/**
 * Start TouchDesigner MCP server
 */
export async function startServer(): Promise<void> {
	const isStdioMode =
		process.env.NODE_ENV === "cli" || process.argv.includes("--stdio");

	try {
		const server = new TouchDesignerServer();

		if (isStdioMode) {
			const transport = new StdioServerTransport();
			const result = await server.connect(transport);

			if (!result.success) {
				throw new Error(`Failed to connect: ${result.error.message}`);
			}
		} else {
			throw new Error(
				"Sorry, this server is not yet available in the browser. Please use the CLI mode.",
			);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Failed to initialize server: ${errorMessage}`);
		process.exit(1);
	}
}

if (process.argv[1]) {
	startServer().catch((error) => {
		console.error("Failed to start server:", error);
		process.exit(1);
	});
}

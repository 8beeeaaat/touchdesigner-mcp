#!/usr/bin/env node

import path, { resolve } from "node:path";
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

// Start server if this file is executed directly
import { fileURLToPath } from "node:url";

const currentFilePath = path.normalize(fileURLToPath(import.meta.url));
const argvFilePath = path.normalize(process.argv[1]);

if (currentFilePath === argvFilePath) {
	startServer().catch((error) => {
		console.error("Failed to start server:", error);
		process.exit(1);
	});
}

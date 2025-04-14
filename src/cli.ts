#!/usr/bin/env node

import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { TouchDesignerServer } from "./server.js";

config({ path: resolve(process.cwd(), ".env") });

export async function startServer(): Promise<void> {
	const isStdioMode =
		process.env.NODE_ENV === "cli" || process.argv.includes("--stdio");

	const server = new TouchDesignerServer();

	if (isStdioMode) {
		const transport = new StdioServerTransport();
		await server.connect(transport);
	} else {
		console.error(
			"Sorry, this server is not yet available in the browser. Please use the CLI mode.",
		);
	}
}

if (process.argv[1]) {
	startServer().catch((error) => {
		console.error("Failed to start server:", error);
		process.exit(1);
	});
}

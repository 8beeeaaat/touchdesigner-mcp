#!/usr/bin/env node

import {
	HUB_APP_NAME,
	HUB_DEFAULT_HOST,
	HUB_DEFAULT_PORT,
} from "./hub/constants.js";
import { startHubServer } from "./hub/server.js";

function parseArgs(argv: string[]) {
	let host = HUB_DEFAULT_HOST;
	let port = HUB_DEFAULT_PORT;
	for (const arg of argv) {
		if (arg.startsWith("--host=")) {
			host = arg.slice("--host=".length);
		} else if (arg.startsWith("--port=")) {
			port = Number.parseInt(arg.slice("--port=".length), 10);
		}
	}
	return { host, port };
}

async function main(): Promise<void> {
	const { host, port } = parseArgs(process.argv.slice(2));
	const hub = await startHubServer({ host, port });
	console.error(`${HUB_APP_NAME} listening on http://${host}:${port}`);

	const shutdown = async () => {
		console.error(`${HUB_APP_NAME} shutting down…`);
		await hub.close();
		process.exit(0);
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}

main().catch((error) => {
	console.error(`${HUB_APP_NAME} failed:`, error);
	process.exit(1);
});

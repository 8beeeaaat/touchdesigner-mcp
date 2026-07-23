import net from "node:net";

/** Hub, lab convention, Stagepad, 4designer — never assign as TD peer listen. */
const SKIP_PORTS = new Set([9980, 9981, 9982, 9983]);

function isPortFree(port: number, host = "127.0.0.1"): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.unref();
		server.once("error", () => resolve(false));
		server.listen(port, host, () => {
			server.close(() => resolve(true));
		});
	});
}

/**
 * Allocate a free preferred TD WebServer listen port (identity is hub peer id).
 * Default scan starts at 9984; skips 9980–9983.
 */
export async function allocateTdMcpPort(from = 9984): Promise<number> {
	let port = Math.max(from, 1000);
	for (let i = 0; i < 200; i++) {
		while (SKIP_PORTS.has(port)) {
			port += 1;
		}
		if (await isPortFree(port)) {
			return port;
		}
		port += 1;
	}
	throw new Error(`No free TD MCP listen port found from ${from} upward`);
}

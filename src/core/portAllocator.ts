import net from "node:net";

const SKIP_PORTS = new Set([9982, 9983]);

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
 * Allocate first free TCP port starting at `from` (default 9984),
 * skipping Stagepad (9982) and 4designer (9983).
 */
export async function allocateTdMcpPort(from = 9984): Promise<number> {
	let port = Math.max(from, 9984);
	for (let i = 0; i < 200; i++) {
		while (SKIP_PORTS.has(port)) {
			port += 1;
		}
		if (await isPortFree(port)) {
			return port;
		}
		port += 1;
	}
	throw new Error("No free TD MCP port found from 9984 upward");
}

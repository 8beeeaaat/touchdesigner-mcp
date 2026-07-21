import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { customInstance } from "../../src/api/customInstance.js";
import { runWithTarget } from "../../src/core/targetContext.js";

async function listen(port: number): Promise<Server> {
	const server = createServer((req, res) => {
		res.writeHead(200, { "content-type": "application/json" });
		res.end(JSON.stringify({ ok: true, port, path: req.url }));
	});
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, "127.0.0.1", () => resolve());
	});
	return server;
}

describe("mock dual-port routing", () => {
	let a: Server;
	let b: Server;

	beforeAll(async () => {
		a = await listen(19984);
		b = await listen(19985);
	});

	afterAll(async () => {
		await Promise.all(
			[a, b].map(
				(s) =>
					new Promise<void>((resolve) => {
						s.close(() => resolve());
					}),
			),
		);
	});

	test("selects correct port via ALS", async () => {
		const r1 = await runWithTarget(
			{ host: "http://127.0.0.1", id: "a", port: 19984 },
			() =>
				customInstance<{ ok: boolean; port: number }>({
					method: "GET",
					url: "http://127.0.0.1:9981/api/ping",
				}),
		);
		const r2 = await runWithTarget(
			{ host: "http://127.0.0.1", id: "b", port: 19985 },
			() =>
				customInstance<{ ok: boolean; port: number }>({
					method: "GET",
					url: "http://127.0.0.1:9981/api/ping",
				}),
		);
		expect(r1.port).toBe(19984);
		expect(r2.port).toBe(19985);
	});
});

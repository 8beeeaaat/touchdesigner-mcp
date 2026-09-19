import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTdInfo } from "../../src/gen/endpoints/TouchDesignerAPI.js";

/**
 * Where the generated client actually sends a request.
 *
 * The base URL used to be baked into every generated URL from the OpenAPI
 * spec's `servers` entry, which carried a JavaScript template that only
 * worked while the generator emitted it unescaped. When that stopped being
 * true, every request asked axios for a URL that was literally
 * `${process.env.TD_WEB_SERVER_HOST}:...` and the whole server went down with
 * `TypeError: Invalid URL`. Nothing caught it, because the generated client
 * is mocked everywhere else.
 */
describe("generated client base URL", () => {
	let server: Server;
	let requestedUrls: string[] = [];
	let host: string;
	let port: string;

	const originalHost = process.env.TD_WEB_SERVER_HOST;
	const originalPort = process.env.TD_WEB_SERVER_PORT;

	beforeAll(async () => {
		server = createServer((req, res) => {
			requestedUrls.push(req.url ?? "");
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					data: {
						mcpApiVersion: "1.5.0",
						osName: "test",
						osVersion: "0",
						server: "TouchDesigner",
						version: "0",
					},
					error: null,
					success: true,
				}),
			);
		});

		await new Promise<void>((resolve) => {
			server.listen(0, "127.0.0.1", resolve);
		});

		port = String((server.address() as AddressInfo).port);
		host = "http://127.0.0.1";
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		process.env.TD_WEB_SERVER_HOST = originalHost;
		process.env.TD_WEB_SERVER_PORT = originalPort;
	});

	it("sends the request to the configured host and port", async () => {
		process.env.TD_WEB_SERVER_HOST = host;
		process.env.TD_WEB_SERVER_PORT = port;
		requestedUrls = [];

		const response = await getTdInfo();

		expect(response.success).toBe(true);
		expect(requestedUrls).toEqual(["/api/td/server/td"]);
	});

	it("picks up a host and port changed after import", async () => {
		// The CLI assigns these while parsing its arguments, which happens
		// after the module graph is loaded, so the values cannot be captured
		// once at import time.
		process.env.TD_WEB_SERVER_HOST = "http://127.0.0.1";
		process.env.TD_WEB_SERVER_PORT = "1";
		process.env.TD_WEB_SERVER_HOST = host;
		process.env.TD_WEB_SERVER_PORT = port;
		requestedUrls = [];

		await getTdInfo();

		expect(requestedUrls).toEqual(["/api/td/server/td"]);
	});

	it("says what is unconfigured instead of failing inside axios", async () => {
		// Absent, not the string "undefined", which is what assigning gives.
		delete process.env.TD_WEB_SERVER_HOST;
		delete process.env.TD_WEB_SERVER_PORT;

		await expect(getTdInfo()).rejects.toThrow(
			/TD_WEB_SERVER_HOST and TD_WEB_SERVER_PORT/,
		);
	});
});

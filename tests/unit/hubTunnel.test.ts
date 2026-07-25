import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import WebSocket from "ws";
import { HubClient } from "../../src/hub/client.js";
import { startHubServer, type HubServer } from "../../src/hub/server.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unlinkSync, existsSync } from "node:fs";

describe("hub tunnel proxy", () => {
	let hub: HubServer;
	const port = 19982;
	const hubUrl = `http://127.0.0.1:${port}`;
	const snapshotPath = join(tmpdir(), `tdmcp-hub-test-${port}.json`);

	beforeAll(async () => {
		if (existsSync(snapshotPath)) unlinkSync(snapshotPath);
		hub = await startHubServer({
			host: "127.0.0.1",
			port,
			snapshotPath,
			restore: false,
		});
	});

	afterAll(async () => {
		await hub.close();
		if (existsSync(snapshotPath)) unlinkSync(snapshotPath);
	});

	afterEach(async () => {
		hub.tunnel.closeAll();
		for (const p of hub.store.list()) {
			hub.store.remove(p.id);
		}
	});

	test("expect + hello nonce mismatch rejected", async () => {
		const client = new HubClient(hubUrl);
		await client.expectPeer({
			id: "owned-t1",
			nonce: "nonce-correct",
			toePath: "C:/x.toe",
		});

		const ws = new WebSocket(`ws://127.0.0.1:${port}/tunnel`);
		await new Promise<void>((resolve, reject) => {
			ws.once("open", () => resolve());
			ws.once("error", reject);
		});
		const ack = await new Promise<{ ok: boolean; error?: string }>(
			(resolve, reject) => {
				ws.once("message", (data) => {
					resolve(JSON.parse(String(data)));
				});
				ws.once("close", () => reject(new Error("closed before ack")));
				ws.send(
					JSON.stringify({
						type: "hello",
						targetId: "owned-t1",
						nonce: "nonce-wrong",
					}),
				);
			},
		);
		expect(ack.ok).toBe(false);
		expect(ack.error).toBe("nonce_mismatch");
		ws.close();
	});

	test("hello + proxy round-trip FIFO", async () => {
		const client = new HubClient(hubUrl);
		await client.expectPeer({
			id: "owned-t2",
			nonce: "n2",
			label: "T2",
			projectDir: "C:/proj",
		});

		const ws = new WebSocket(`ws://127.0.0.1:${port}/tunnel`);
		await new Promise<void>((resolve, reject) => {
			ws.once("open", () => resolve());
			ws.once("error", reject);
		});

		ws.on("message", (data) => {
			const msg = JSON.parse(String(data));
			if (msg.type === "request") {
				ws.send(
					JSON.stringify({
						type: "response",
						id: msg.id,
						statusCode: 200,
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							success: true,
							data: { echoPath: msg.path, method: msg.method },
						}),
					}),
				);
			}
		});

		const ack = await new Promise<{ ok: boolean }>((resolve) => {
			const onMsg = (data: WebSocket.RawData) => {
				const msg = JSON.parse(String(data));
				if (msg.type === "hello_ack") {
					ws.off("message", onMsg);
					resolve(msg);
				}
			};
			ws.on("message", onMsg);
			ws.send(
				JSON.stringify({
					type: "hello",
					targetId: "owned-t2",
					nonce: "n2",
					osPid: 4242,
					projectName: "demo.toe",
					projectFolder: "C:/proj",
				}),
			);
		});
		expect(ack.ok).toBe(true);

		const connected = await client.peerConnected("owned-t2");
		expect(connected.connected).toBe(true);
		expect(connected.peer?.osPid).toBe(4242);
		expect(connected.peer?.transport).toBe("tunnel");

		const res = await fetch(
			`${hubUrl}/proxy/owned-t2/api/td/server/td`,
			{ method: "GET" },
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			success: boolean;
			data: { echoPath: string; method: string };
		};
		expect(body.success).toBe(true);
		expect(body.data.echoPath).toBe("/api/td/server/td");
		expect(body.data.method).toBe("GET");

		// POST with body
		const res2 = await fetch(
			`${hubUrl}/proxy/owned-t2/api/td/server/exec`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ script: "1+1" }),
			},
		);
		expect(res2.status).toBe(200);

		ws.close();
	});

	test("proxy offline returns 502", async () => {
		const client = new HubClient(hubUrl);
		await client.expectPeer({ id: "owned-offline", nonce: "x" });
		const res = await fetch(
			`${hubUrl}/proxy/owned-offline/api/td/server/td`,
		);
		expect(res.status).toBe(502);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("tunnel_offline");
	});

	test("request timeout", async () => {
		const client = new HubClient(hubUrl);
		await client.expectPeer({ id: "owned-slow", nonce: "slow" });
		const ws = new WebSocket(`ws://127.0.0.1:${port}/tunnel`);
		await new Promise<void>((resolve, reject) => {
			ws.once("open", () => resolve());
			ws.once("error", reject);
		});
		// swallow requests — never respond
		ws.on("message", (data) => {
			const msg = JSON.parse(String(data));
			if (msg.type === "hello_ack") return;
		});
		await new Promise<{ ok: boolean }>((resolve) => {
			const onMsg = (data: WebSocket.RawData) => {
				const msg = JSON.parse(String(data));
				if (msg.type === "hello_ack") {
					ws.off("message", onMsg);
					resolve(msg);
				}
			};
			ws.on("message", onMsg);
			ws.send(
				JSON.stringify({
					type: "hello",
					targetId: "owned-slow",
					nonce: "slow",
				}),
			);
		});

		const res = await fetch(
			`${hubUrl}/proxy/owned-slow/api/td/server/td`,
			{ headers: { "x-tdmcp-timeout-ms": "200" } },
		);
		expect(res.status).toBe(504);
		ws.close();
	});
});

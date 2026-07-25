import { afterAll, beforeAll, describe, expect, test } from "vitest";
import WebSocket from "ws";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTdProject } from "../../src/core/lifecycle.js";
import {
	resetTargetRegistryForTests,
	TargetRegistry,
} from "../../src/core/targetRegistry.js";
import { HubClient } from "../../src/hub/client.js";
import { startHubServer, type HubServer } from "../../src/hub/server.js";
import { startTdProject } from "../../src/lifecycle/tdProcess.js";
import { createTouchDesignerClient } from "../../src/tdClient/index.js";

describe("tunnel lifecycle (fake peer)", () => {
	let hub: HubServer;
	const port = 19983;
	const hubUrl = `http://127.0.0.1:${port}`;
	let destDir: string;

	beforeAll(async () => {
		process.env.TDMCP_HUB_URL = hubUrl;
		hub = await startHubServer({
			host: "127.0.0.1",
			port,
			restore: false,
		});
		destDir = mkdtempSync(join(tmpdir(), "tdmcp-tunnel-life-"));
	});

	afterAll(async () => {
		await hub.close();
		rmSync(destDir, { force: true, recursive: true });
		delete process.env.TDMCP_HUB_URL;
	});

	test("create writes tunnel state + start waits for nonce hello", async () => {
		const created = await createTdProject({
			destDir: join(destDir, "proj"),
			name: "tunnel_demo",
		});
		expect(created.transport).toBe("tunnel");
		expect(created.nonce).toBeTruthy();
		expect(created.port).toBe(0);

		const registry = new TargetRegistry(undefined, { seedLab: false });
		resetTargetRegistryForTests(registry);
		registry.attachHub(new HubClient(hubUrl));

		const nullLogger = { sendLog: () => {} };
		const tdClient = createTouchDesignerClient({ logger: nullLogger });

		// Fake TD peer connects after a short delay (simulates spawn)
		const connectFake = async () => {
			await new Promise((r) => setTimeout(r, 200));
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
							body: JSON.stringify({
								success: true,
								data: { server: "fake" },
							}),
						}),
					);
				}
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
						targetId: created.targetId,
						nonce: created.nonce,
						osPid: 99901,
						projectFolder: created.destDir,
						projectName: "tunnel_demo.toe",
						toePath: created.toePath,
					}),
				);
			});
			return ws;
		};

		const fakePromise = connectFake();
		const result = await startTdProject({
			hubClient: new HubClient(hubUrl),
			registry,
			tdClient,
			toePath: created.toePath,
			timeoutMs: 15_000,
			_test: {
				pid: 99901,
				skipSpawn: true,
				inspect: async () => ({
					dialogs: [],
					mainWindowTitle: null,
					responding: true,
				}),
				inspectLight: async () => ({
					dialogs: [],
					mainWindowTitle: null,
					responding: true,
				}),
				dismissAll: async () => ({ attempted: [], dismissed: [] }),
			},
		});
		const ws = await fakePromise;
		expect(result.transport).toBe("tunnel");
		expect(result.identity?.osPid).toBe(99901);
		expect(result.targetId).toBe(created.targetId);

		const connected = await new HubClient(hubUrl).peerConnected(
			created.targetId,
		);
		expect(connected.connected).toBe(true);
		ws.close();
	});
});

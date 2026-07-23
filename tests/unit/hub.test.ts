import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { HubClient } from "../../src/hub/client.js";
import { ensureHub, hubHealthOk } from "../../src/hub/ensureHub.js";
import { PeerStore } from "../../src/hub/peerStore.js";
import { startHubServer, type HubServer } from "../../src/hub/server.js";
import { HUB_APP_NAME } from "../../src/hub/constants.js";

describe("PeerStore", () => {
	test("register list select heartbeat sweep", () => {
		const store = new PeerStore(100);
		const t0 = 1_000_000;
		store.register(
			{
				host: "http://127.0.0.1",
				id: "a",
				port: 19990,
				source: "registered",
			},
			t0,
		);
		expect(store.list(t0)).toHaveLength(1);
		expect(store.getSelectedId()).toBe("a");
		store.register(
			{
				host: "http://127.0.0.1",
				id: "b",
				port: 19991,
				source: "owned",
			},
			t0,
		);
		store.select("b");
		expect(store.getSelected()?.id).toBe("b");
		store.heartbeat("b", t0 + 150);
		const dropped = store.sweep(t0 + 200);
		expect(dropped).toContain("a");
		expect(store.get("b")).toBeTruthy();
	});
});

describe("hub HTTP + ensureHub", () => {
	let hub: HubServer;
	const port = 19980;
	const hubUrl = `http://127.0.0.1:${port}`;

	beforeAll(async () => {
		hub = await startHubServer({ port, host: "127.0.0.1" });
	});

	afterAll(async () => {
		await hub.close();
	});

	afterEach(async () => {
		for (const p of hub.store.list()) {
			hub.store.remove(p.id);
		}
	});

	test("health app name", async () => {
		expect(await hubHealthOk(hubUrl)).toBe(true);
		const client = new HubClient(hubUrl);
		const h = await client.health();
		expect(h.app).toBe(HUB_APP_NAME);
	});

	test("register list select", async () => {
		const client = new HubClient(hubUrl);
		await client.register({
			host: "http://127.0.0.1",
			id: "peer-1",
			label: "P1",
			port: 19984,
			source: "registered",
		});
		const listed = await client.listPeers();
		expect(listed.peers.map((p) => p.id)).toContain("peer-1");
		await client.select("peer-1");
		const sticky = await client.getSticky();
		expect(sticky.selectedId).toBe("peer-1");
		expect(sticky.peer?.port).toBe(19984);
	});

	test("ensureHub is no-op when healthy", async () => {
		const r1 = await ensureHub({ hubUrl, pollOnly: true });
		expect(r1.alreadyRunning).toBe(true);
		expect(r1.spawned).toBe(false);
		const r2 = await ensureHub({ hubUrl, pollOnly: true });
		expect(r2.alreadyRunning).toBe(true);
	});

	test("concurrent register", async () => {
		const client = new HubClient(hubUrl);
		await Promise.all([
			client.register({
				host: "http://127.0.0.1",
				id: "c1",
				port: 18001,
				source: "owned",
			}),
			client.register({
				host: "http://127.0.0.1",
				id: "c2",
				port: 18002,
				source: "owned",
			}),
		]);
		const { peers } = await client.listPeers();
		expect(peers.map((p) => p.id).sort()).toEqual(["c1", "c2"]);
	});
});

describe("TargetRegistry hub sync survives remount", () => {
	let hub: HubServer;
	const port = 19981;
	const hubUrl = `http://127.0.0.1:${port}`;

	beforeAll(async () => {
		hub = await startHubServer({ host: "127.0.0.1", port });
	});

	afterAll(async () => {
		await hub.close();
	});

	test("second registry sees registered peer after sync", async () => {
		const { TargetRegistry } = await import(
			"../../src/core/targetRegistry.js"
		);
		const a = new TargetRegistry(undefined, { seedLab: false });
		a.attachHub(new HubClient(hubUrl));
		await a.upsertOwnedAsync({
			host: "http://127.0.0.1",
			id: "owned-survive",
			label: "s",
			port: 18888,
		});

		const b = new TargetRegistry(undefined, { seedLab: true });
		b.attachHub(new HubClient(hubUrl));
		await b.syncFromHub();
		expect(b.get("owned-survive")?.port).toBe(18888);
		await b.selectAsync("owned-survive");
		expect(b.getSelectedId()).toBe("owned-survive");
	});
});

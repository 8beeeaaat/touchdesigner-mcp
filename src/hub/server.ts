import express, { type Express } from "express";
import { MCP_SERVER_VERSION } from "../core/version.js";
import {
	HUB_APP_NAME,
	HUB_DEFAULT_HOST,
	HUB_DEFAULT_PORT,
	HUB_SWEEP_INTERVAL_MS,
} from "./constants.js";
import { PeerStore } from "./peerStore.js";
import {
	heartbeatBodySchema,
	registerPeerBodySchema,
	stickyBodySchema,
} from "./types.js";

export type HubServer = {
	app: Express;
	store: PeerStore;
	close: () => Promise<void>;
};

/**
 * Build the Express app for tdmcp-hub (does not listen).
 */
export function createHubApp(store = new PeerStore()): {
	app: Express;
	store: PeerStore;
} {
	const app = express();
	app.use(express.json({ limit: "256kb" }));

	app.get("/health", (_req, res) => {
		res.json({
			app: HUB_APP_NAME,
			ok: true,
			peerCount: store.count(),
			selectedId: store.getSelectedId(),
			version: MCP_SERVER_VERSION,
		});
	});

	app.get("/peers", (_req, res) => {
		res.json({
			peers: store.list(),
			selectedId: store.getSelectedId(),
		});
	});

	app.post("/peers/register", (req, res) => {
		const parsed = registerPeerBodySchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: "invalid_body", details: parsed.error });
			return;
		}
		const peer = store.register(parsed.data);
		res.json({ peer, selectedId: store.getSelectedId() });
	});

	app.post("/peers/heartbeat", (req, res) => {
		const parsed = heartbeatBodySchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: "invalid_body", details: parsed.error });
			return;
		}
		const peer = store.heartbeat(parsed.data.id);
		if (!peer) {
			res.status(404).json({ error: "unknown_peer", id: parsed.data.id });
			return;
		}
		res.json({ peer });
	});

	app.delete("/peers/:id", (req, res) => {
		const id = req.params.id;
		if (!store.remove(id)) {
			res.status(404).json({ error: "unknown_peer", id });
			return;
		}
		res.json({ ok: true, selectedId: store.getSelectedId() });
	});

	app.get("/sticky", (_req, res) => {
		res.json({
			peer: store.getSelected(),
			selectedId: store.getSelectedId(),
		});
	});

	app.put("/sticky", (req, res) => {
		const parsed = stickyBodySchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: "invalid_body", details: parsed.error });
			return;
		}
		try {
			const peer = store.select(parsed.data.id);
			res.json({ peer, selectedId: store.getSelectedId() });
		} catch {
			res.status(404).json({ error: "unknown_peer", id: parsed.data.id });
		}
	});

	return { app, store };
}

/**
 * Listen on 127.0.0.1:9980 (or overrides). Starts TTL sweep.
 */
export async function startHubServer(options?: {
	host?: string;
	port?: number;
	store?: PeerStore;
}): Promise<HubServer> {
	const host = options?.host ?? HUB_DEFAULT_HOST;
	const port = options?.port ?? HUB_DEFAULT_PORT;
	const { app, store } = createHubApp(options?.store);

	const sweep = setInterval(() => {
		store.sweep();
	}, HUB_SWEEP_INTERVAL_MS);
	sweep.unref();

	const server = await new Promise<import("node:http").Server>(
		(resolve, reject) => {
			const s = app.listen(port, host, () => resolve(s));
			s.once("error", reject);
		},
	);

	return {
		app,
		close: async () => {
			clearInterval(sweep);
			await new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()));
			});
		},
		store,
	};
}

import express, { type Express, type Request, type Response } from "express";
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";
import { MCP_SERVER_VERSION } from "../core/version.js";
import {
	HUB_APP_NAME,
	HUB_DEFAULT_HOST,
	HUB_DEFAULT_PORT,
	HUB_SWEEP_INTERVAL_MS,
} from "./constants.js";
import {
	defaultHubSnapshotPath,
	loadHubSnapshot,
	saveHubSnapshot,
} from "./persistence.js";
import { PeerStore } from "./peerStore.js";
import { TunnelManager } from "./tunnelManager.js";
import { expectPeerBodySchema } from "./tunnelTypes.js";
import {
	heartbeatBodySchema,
	registerPeerBodySchema,
	stickyBodySchema,
} from "./types.js";

export type HubServer = {
	app: Express;
	store: PeerStore;
	tunnel: TunnelManager;
	close: () => Promise<void>;
};

/**
 * Build the Express app for tdmcp-hub (does not listen).
 */
export function createHubApp(
	store = new PeerStore(),
	tunnel?: TunnelManager,
): {
	app: Express;
	store: PeerStore;
	tunnel: TunnelManager;
} {
	const tunnelMgr =
		tunnel ??
		new TunnelManager(store, () => {
			persistStore(store);
		});
	const app = express();
	app.use(express.json({ limit: "32mb" }));

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
			expects: tunnelMgr.listExpects().map((e) => ({
				id: e.id,
				expiresAt: e.expiresAt,
				hasNonce: Boolean(e.nonce),
			})),
		});
	});

	app.post("/peers/register", (req, res) => {
		const parsed = registerPeerBodySchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: "invalid_body", details: parsed.error });
			return;
		}
		const peer = store.register(parsed.data);
		persistStore(store);
		res.json({ peer, selectedId: store.getSelectedId() });
	});

	app.post("/peers/expect", (req, res) => {
		const parsed = expectPeerBodySchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: "invalid_body", details: parsed.error });
			return;
		}
		const expect = tunnelMgr.expectPeer(parsed.data);
		// Placeholder peer so list/select work before TD connects
		store.register({
			host: "http://127.0.0.1",
			id: parsed.data.id,
			label: parsed.data.label || parsed.data.id,
			port: 0,
			projectDir: parsed.data.projectDir,
			source: "owned",
			toePath: parsed.data.toePath,
			transport: "tunnel",
			nonce: parsed.data.nonce,
			tunnelConnected: false,
		});
		persistStore(store);
		res.json({ expect, selectedId: store.getSelectedId() });
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
		if (tunnelMgr.isConnected(id)) {
			tunnelMgr.detachPeer(id);
		}
		if (!store.remove(id)) {
			res.status(404).json({ error: "unknown_peer", id });
			return;
		}
		persistStore(store);
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
			persistStore(store);
			res.json({ peer, selectedId: store.getSelectedId() });
		} catch {
			res.status(404).json({ error: "unknown_peer", id: parsed.data.id });
		}
	});

	app.get("/peers/:id/connected", (req, res) => {
		const id = req.params.id;
		const connected = tunnelMgr.isConnected(id);
		const peer = store.get(id) ?? null;
		res.json({ id, connected, peer });
	});

	/**
	 * Proxy OpenAPI paths to a tunnel-connected peer.
	 * e.g. GET /proxy/:peerId/api/td/server/td
	 */
	app.use("/proxy/:peerId", async (req, res, next) => {
		if (!req.path.startsWith("/api/") && !req.url.startsWith("/api/")) {
			next();
			return;
		}
		await handleProxy(tunnelMgr, req, res);
	});

	return { app, store, tunnel: tunnelMgr };
}

async function handleProxy(
	tunnel: TunnelManager,
	req: Request,
	res: Response,
): Promise<void> {
	const peerId =
		(req.params as { peerId?: string }).peerId || extractPeerId(req.originalUrl);
	if (!peerId) {
		res.status(400).json({ error: "missing_peer_id" });
		return;
	}
	if (!tunnel.isConnected(peerId)) {
		res.status(502).json({ error: "tunnel_offline", peerId });
		return;
	}

	// Mounted at /proxy/:peerId — req.path is relative ("/api/...") or use originalUrl
	const full = req.originalUrl.split("?")[0] ?? req.path;
	const apiIdx = full.indexOf("/api/");
	const apiPath = apiIdx >= 0 ? full.slice(apiIdx) : req.path;
	const query: Record<string, string> = {};
	for (const [k, v] of Object.entries(req.query)) {
		if (typeof v === "string") query[k] = v;
		else if (Array.isArray(v) && typeof v[0] === "string") query[k] = v[0];
	}

	let body: string | Record<string, unknown> | undefined;
	if (req.method !== "GET" && req.method !== "HEAD") {
		if (typeof req.body === "string") body = req.body;
		else if (req.body != null) body = req.body as Record<string, unknown>;
	}

	const timeoutRaw = req.headers["x-tdmcp-timeout-ms"];
	const timeoutMs =
		typeof timeoutRaw === "string" ? Number.parseInt(timeoutRaw, 10) : undefined;

	try {
		const response = await tunnel.proxyRequest(peerId, {
			method: req.method,
			path: apiPath,
			query: Object.keys(query).length ? query : undefined,
			headers: {
				"content-type":
					(req.headers["content-type"] as string) || "application/json",
			},
			body,
			timeoutMs:
				Number.isFinite(timeoutMs) && (timeoutMs as number) > 0
					? timeoutMs
					: undefined,
		});
		res.status(response.statusCode);
		if (response.headers) {
			for (const [k, v] of Object.entries(response.headers)) {
				res.setHeader(k, v);
			}
		}
		if (!res.getHeader("content-type")) {
			res.setHeader("content-type", "application/json");
		}
		res.send(response.body ?? "");
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const status = msg.includes("timeout") ? 504 : 502;
		res.status(status).json({ error: "proxy_failed", message: msg, peerId });
	}
}

function extractPeerId(path: string): string | null {
	const m = path.match(/^\/proxy\/([^/]+)\//);
	return m?.[1] ?? null;
}

function persistStore(store: PeerStore, path?: string): void {
	try {
		saveHubSnapshot(
			{
				selectedId: store.getSelectedId(),
				peers: store.list().map((p) => {
					const {
						lastHeartbeatAt: _h,
						registeredAt: _r,
						...peer
					} = p;
					return peer;
				}),
			},
			path ?? defaultHubSnapshotPath(),
		);
	} catch {
		// ignore
	}
}

function restoreStore(store: PeerStore, path?: string): void {
	const snap = loadHubSnapshot(path ?? defaultHubSnapshotPath());
	if (!snap) return;
	for (const peer of snap.peers) {
		// Don't restore tunnelConnected as true — sockets are gone
		store.register({
			...peer,
			tunnelConnected: peer.transport === "tunnel" ? false : peer.tunnelConnected,
		});
	}
	if (snap.selectedId) {
		try {
			store.select(snap.selectedId);
		} catch {
			// sticky peer missing
		}
	}
}

/**
 * Listen on 127.0.0.1:9980 (or overrides). Starts TTL sweep + WS tunnel.
 */
export async function startHubServer(options?: {
	host?: string;
	port?: number;
	store?: PeerStore;
	snapshotPath?: string;
	restore?: boolean;
}): Promise<HubServer> {
	const host = options?.host ?? HUB_DEFAULT_HOST;
	const port = options?.port ?? HUB_DEFAULT_PORT;
	const store = options?.store ?? new PeerStore();
	if (options?.restore !== false) {
		restoreStore(store, options?.snapshotPath);
	}

	const { app, tunnel } = createHubApp(
		store,
		new TunnelManager(store, () => {
			persistStore(store, options?.snapshotPath);
		}),
	);

	const sweep = setInterval(() => {
		// Tunnel peers: keep alive while connected OR while an expect is pending
		for (const peer of store.list()) {
			if (peer.transport === "tunnel") {
				if (tunnel.isConnected(peer.id) || tunnel.getExpect(peer.id)) {
					store.heartbeat(peer.id);
				}
			}
		}
		store.sweep();
	}, HUB_SWEEP_INTERVAL_MS);
	sweep.unref();

	const server = await new Promise<HttpServer>((resolve, reject) => {
		const s = app.listen(port, host, () => resolve(s));
		s.once("error", reject);
	});

	const wss = new WebSocketServer({ server, path: "/tunnel" });
	wss.on("connection", (ws) => {
		tunnel.attachSocket(ws);
	});

	return {
		app,
		close: async () => {
			clearInterval(sweep);
			tunnel.closeAll();
			await new Promise<void>((resolve, reject) => {
				wss.close((err) => {
					if (err) reject(err);
					else {
						server.close((e) => (e ? reject(e) : resolve()));
					}
				});
			});
		},
		store,
		tunnel,
	};
}

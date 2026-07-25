import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { PeerStore } from "./peerStore.js";
import {
	type ExpectPeerBody,
	type TunnelHello,
	type TunnelRequest,
	type TunnelResponse,
	TUNNEL_DEFAULT_TIMEOUT_MS,
	tunnelHelloSchema,
	tunnelResponseSchema,
} from "./tunnelTypes.js";
import type { HubPeer } from "./types.js";

export type PendingExpect = ExpectPeerBody & {
	expiresAt: number;
};

type PendingRequest = {
	resolve: (response: TunnelResponse) => void;
	reject: (err: Error) => void;
	timer: ReturnType<typeof setTimeout>;
};

type PeerSocket = {
	ws: WebSocket;
	targetId: string;
	queue: Promise<void>;
	pending: Map<string, PendingRequest>;
};

/**
 * Manages TD dial-out WebSocket tunnels: expect/nonce hello, per-peer FIFO
 * request proxying, and correlation.
 */
export class TunnelManager {
	private readonly expects = new Map<string, PendingExpect>();
	private readonly sockets = new Map<string, PeerSocket>();
	private persistTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private readonly store: PeerStore,
		private readonly onPersist?: () => void,
	) {}

	expectPeer(body: ExpectPeerBody): PendingExpect {
		const ttlMs = body.ttlMs ?? 600_000;
		const record: PendingExpect = {
			...body,
			expiresAt: Date.now() + ttlMs,
		};
		this.expects.set(body.id, record);
		this.schedulePersist();
		return record;
	}

	getExpect(id: string): PendingExpect | undefined {
		const e = this.expects.get(id);
		if (!e) return undefined;
		if (Date.now() > e.expiresAt) {
			this.expects.delete(id);
			return undefined;
		}
		return e;
	}

	listExpects(): PendingExpect[] {
		const now = Date.now();
		for (const [id, e] of this.expects) {
			if (now > e.expiresAt) this.expects.delete(id);
		}
		return [...this.expects.values()];
	}

	isConnected(targetId: string): boolean {
		const sock = this.sockets.get(targetId);
		return Boolean(sock && sock.ws.readyState === sock.ws.OPEN);
	}

	getConnectedPeer(targetId: string): HubPeer | undefined {
		if (!this.isConnected(targetId)) return undefined;
		return this.store.get(targetId);
	}

	/**
	 * Find a connected peer whose nonce matched and optional filters pass.
	 */
	findConnectedByNonce(nonce: string): HubPeer | undefined {
		for (const peer of this.store.list()) {
			if (
				peer.transport === "tunnel" &&
				peer.nonce === nonce &&
				this.isConnected(peer.id)
			) {
				return peer;
			}
		}
		return undefined;
	}

	attachSocket(ws: WebSocket): void {
		let boundId: string | null = null;

		ws.on("message", (data) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(String(data));
			} catch {
				this.sendJson(ws, {
					type: "hello_ack",
					ok: false,
					error: "invalid_json",
				});
				ws.close(1003, "invalid_json");
				return;
			}

			const obj = parsed as { type?: string };
			if (obj.type === "hello") {
				const hello = tunnelHelloSchema.safeParse(parsed);
				if (!hello.success) {
					this.sendJson(ws, {
						type: "hello_ack",
						ok: false,
						error: "invalid_hello",
					});
					ws.close(1003, "invalid_hello");
					return;
				}
				const result = this.handleHello(ws, hello.data);
				if (!result.ok) {
					this.sendJson(ws, {
						type: "hello_ack",
						ok: false,
						error: result.error,
					});
					ws.close(1008, result.error ?? "hello_rejected");
					return;
				}
				boundId = hello.data.targetId;
				this.sendJson(ws, {
					type: "hello_ack",
					ok: true,
					targetId: boundId,
				});
				return;
			}

			if (obj.type === "response") {
				const resp = tunnelResponseSchema.safeParse(parsed);
				if (!resp.success || !boundId) return;
				const sock = this.sockets.get(boundId);
				if (!sock) return;
				const pending = sock.pending.get(resp.data.id);
				if (!pending) return;
				clearTimeout(pending.timer);
				sock.pending.delete(resp.data.id);
				pending.resolve(resp.data);
				return;
			}
		});

		ws.on("close", () => {
			if (boundId) this.detachPeer(boundId);
		});

		ws.on("error", () => {
			if (boundId) this.detachPeer(boundId);
		});
	}

	private handleHello(
		ws: WebSocket,
		hello: TunnelHello,
	): { ok: true } | { ok: false; error: string } {
		const expect = this.getExpect(hello.targetId);
		if (!expect) {
			return { ok: false, error: "unknown_or_expired_expect" };
		}
		if (expect.nonce !== hello.nonce) {
			return { ok: false, error: "nonce_mismatch" };
		}

		// Replace any existing socket for this id
		const existing = this.sockets.get(hello.targetId);
		if (existing && existing.ws !== ws) {
			try {
				existing.ws.close(1000, "replaced");
			} catch {
				// ignore
			}
			this.rejectAllPending(existing, new Error("tunnel replaced"));
		}

		const peer: HubPeer = {
			host: "http://127.0.0.1",
			id: hello.targetId,
			label: hello.label || expect.label || hello.targetId,
			port: 0,
			source: hello.targetId === "lab" ? "registered" : "owned",
			transport: "tunnel",
			nonce: hello.nonce,
			osPid: hello.osPid,
			projectFolder: hello.projectFolder,
			projectDir: expect.projectDir,
			projectName: hello.projectName,
			toePath: hello.toePath || expect.toePath,
			tunnelConnected: true,
		};
		this.store.register(peer);
		// Consume expect so a second process can't reclaim with the same nonce
		// unless MCP re-expects. Keep expect for reconnect with same nonce within TTL.
		// Reconnect: allow same nonce to reconnect — do NOT delete expect yet.
		// Soft-refresh expect expiry on successful hello.
		this.expects.set(hello.targetId, {
			...expect,
			expiresAt: Date.now() + (expect.ttlMs ?? 600_000),
		});

		this.sockets.set(hello.targetId, {
			ws,
			targetId: hello.targetId,
			queue: Promise.resolve(),
			pending: new Map(),
		});
		this.schedulePersist();
		return { ok: true };
	}

	detachPeer(targetId: string): void {
		const sock = this.sockets.get(targetId);
		if (!sock) return;
		this.sockets.delete(targetId);
		this.rejectAllPending(sock, new Error("tunnel disconnected"));
		const peer = this.store.get(targetId);
		if (peer?.transport === "tunnel") {
			this.store.register({
				...peer,
				tunnelConnected: false,
			});
		}
		this.schedulePersist();
	}

	private rejectAllPending(sock: PeerSocket, err: Error): void {
		for (const [, pending] of sock.pending) {
			clearTimeout(pending.timer);
			pending.reject(err);
		}
		sock.pending.clear();
	}

	/**
	 * Proxy an OpenAPI-shaped HTTP request over the tunnel (FIFO per peer).
	 */
	proxyRequest(
		targetId: string,
		params: {
			method: string;
			path: string;
			query?: Record<string, string>;
			headers?: Record<string, string>;
			body?: string | Record<string, unknown>;
			timeoutMs?: number;
		},
	): Promise<TunnelResponse> {
		const sock = this.sockets.get(targetId);
		if (!sock || sock.ws.readyState !== sock.ws.OPEN) {
			return Promise.reject(
				new Error(`tunnel offline for peer "${targetId}"`),
			);
		}

		const run = (): Promise<TunnelResponse> =>
			new Promise<TunnelResponse>((resolve, reject) => {
				const id = randomUUID();
				const timeoutMs = params.timeoutMs ?? TUNNEL_DEFAULT_TIMEOUT_MS;
				const timer = setTimeout(() => {
					sock.pending.delete(id);
					reject(
						new Error(
							`tunnel request timeout after ${timeoutMs}ms (${params.method} ${params.path})`,
						),
					);
				}, timeoutMs);
				sock.pending.set(id, { resolve, reject, timer });

				const req: TunnelRequest = {
					type: "request",
					id,
					method: params.method.toUpperCase(),
					path: params.path,
					query: params.query,
					headers: params.headers,
					body: params.body,
				};
				try {
					sock.ws.send(JSON.stringify(req));
				} catch (err) {
					clearTimeout(timer);
					sock.pending.delete(id);
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			});

		const next = sock.queue.then(run, run);
		sock.queue = next.then(
			() => undefined,
			() => undefined,
		);
		return next;
	}

	closeAll(): void {
		for (const [id, sock] of this.sockets) {
			this.rejectAllPending(sock, new Error("hub closing"));
			try {
				sock.ws.close(1001, "hub_closing");
			} catch {
				// ignore
			}
			this.sockets.delete(id);
		}
		if (this.persistTimer) {
			clearTimeout(this.persistTimer);
			this.persistTimer = null;
		}
	}

	private sendJson(ws: WebSocket, msg: unknown): void {
		if (ws.readyState === ws.OPEN) {
			ws.send(JSON.stringify(msg));
		}
	}

	private schedulePersist(): void {
		if (!this.onPersist) return;
		if (this.persistTimer) clearTimeout(this.persistTimer);
		this.persistTimer = setTimeout(() => {
			this.persistTimer = null;
			try {
				this.onPersist?.();
			} catch {
				// ignore persist errors
			}
		}, 100);
		this.persistTimer.unref?.();
	}
}

import { HUB_PEER_TTL_MS } from "./constants.js";
import type { HubPeer, HubPeerRecord } from "./types.js";

/**
 * In-memory peer registry for a single hub process.
 */
export class PeerStore {
	private readonly peers = new Map<string, HubPeerRecord>();
	private selectedId: string | null = null;
	private readonly ttlMs: number;

	constructor(ttlMs = HUB_PEER_TTL_MS) {
		this.ttlMs = ttlMs;
	}

	register(peer: HubPeer, now = Date.now()): HubPeerRecord {
		const existing = this.peers.get(peer.id);
		const record: HubPeerRecord = {
			...peer,
			lastHeartbeatAt: now,
			registeredAt: existing?.registeredAt ?? now,
		};
		this.peers.set(peer.id, record);
		if (this.selectedId === null) {
			this.selectedId = peer.id;
		}
		return { ...record };
	}

	heartbeat(id: string, now = Date.now()): HubPeerRecord | null {
		const peer = this.peers.get(id);
		if (!peer) return null;
		peer.lastHeartbeatAt = now;
		return { ...peer };
	}

	remove(id: string): boolean {
		const ok = this.peers.delete(id);
		if (ok && this.selectedId === id) {
			this.selectedId = this.peers.keys().next().value ?? null;
		}
		return ok;
	}

	get(id: string): HubPeerRecord | undefined {
		const p = this.peers.get(id);
		return p ? { ...p } : undefined;
	}

	list(now = Date.now()): HubPeerRecord[] {
		this.sweep(now);
		return [...this.peers.values()].map((p) => ({ ...p }));
	}

	getSelectedId(): string | null {
		return this.selectedId;
	}

	getSelected(): HubPeerRecord | null {
		if (!this.selectedId) return null;
		const p = this.peers.get(this.selectedId);
		return p ? { ...p } : null;
	}

	select(id: string): HubPeerRecord {
		const p = this.peers.get(id);
		if (!p) {
			throw new Error(`Unknown peer "${id}"`);
		}
		this.selectedId = id;
		return { ...p };
	}

	sweep(now = Date.now()): string[] {
		const dropped: string[] = [];
		for (const [id, peer] of this.peers) {
			if (now - peer.lastHeartbeatAt > this.ttlMs) {
				this.peers.delete(id);
				dropped.push(id);
			}
		}
		if (this.selectedId && !this.peers.has(this.selectedId)) {
			this.selectedId = this.peers.keys().next().value ?? null;
		}
		return dropped;
	}

	count(): number {
		return this.peers.size;
	}
}

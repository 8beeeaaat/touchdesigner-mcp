import { getHubClient, type HubClient } from "../hub/client.js";
import type { HubPeer } from "../hub/types.js";
import {
	LAB_TARGET_ID,
	normalizeHost,
	type TdTarget,
	type TargetOrigin,
	type TargetSource,
} from "./targetTypes.js";

function peerToTarget(peer: HubPeer): TdTarget {
	const source: TargetSource =
		peer.source === "owned"
			? "owned"
			: peer.source === "builtin" || peer.id === LAB_TARGET_ID
				? "builtin"
				: "owned";
	return {
		host: normalizeHost(peer.host),
		id: peer.id,
		label: peer.label || peer.id,
		port: peer.port,
		projectDir: peer.projectDir,
		source,
		toePath: peer.toePath,
	};
}

function targetToPeer(target: TdTarget): HubPeer {
	return {
		host: normalizeHost(target.host),
		id: target.id,
		label: target.label,
		port: target.port,
		projectDir: target.projectDir,
		source:
			target.source === "builtin"
				? "builtin"
				: target.source === "owned"
					? "owned"
					: "registered",
		toePath: target.toePath,
	};
}

/**
 * Sticky target registry. With a HubClient attached, durable peers/sticky live
 * on tdmcp-hub; local maps are a cache refreshed via `syncFromHub`.
 */
export class TargetRegistry {
	private readonly targets = new Map<string, TdTarget>();
	private selectedId: string = LAB_TARGET_ID;
	private hub: HubClient | null = null;
	private readonly seedLab: boolean;

	constructor(
		lab?: Partial<Pick<TdTarget, "host" | "port" | "label">>,
		options?: { seedLab?: boolean },
	) {
		this.seedLab = options?.seedLab !== false;
		if (this.seedLab) {
			const host = normalizeHost(lab?.host || "http://127.0.0.1");
			const port = lab?.port ?? 9981;
			this.targets.set(LAB_TARGET_ID, {
				host,
				id: LAB_TARGET_ID,
				label: lab?.label || "Lab (conventional :9981)",
				port,
				source: "builtin",
			});
			this.selectedId = LAB_TARGET_ID;
		}
	}

	attachHub(client: HubClient): void {
		this.hub = client;
	}

	detachHub(): void {
		this.hub = null;
	}

	hasHub(): boolean {
		return this.hub !== null;
	}

	/**
	 * Pull peers + sticky from hub into the local cache.
	 * Soft-seeds lab @9981 when hub has no `lab` peer.
	 */
	async syncFromHub(): Promise<void> {
		if (!this.hub) return;
		const { peers, selectedId } = await this.hub.listPeers();
		this.targets.clear();
		for (const peer of peers) {
			this.targets.set(peer.id, peerToTarget(peer));
		}
		if (this.seedLab && !this.targets.has(LAB_TARGET_ID)) {
			this.targets.set(LAB_TARGET_ID, {
				host: normalizeHost(
					process.env.TD_WEB_SERVER_HOST || "http://127.0.0.1",
				),
				id: LAB_TARGET_ID,
				label: "Lab (conventional :9981)",
				port: Number.parseInt(process.env.TD_WEB_SERVER_PORT || "9981", 10),
				source: "builtin",
			});
		}
		if (selectedId && this.targets.has(selectedId)) {
			this.selectedId = selectedId;
		} else if (this.targets.has(LAB_TARGET_ID)) {
			this.selectedId = LAB_TARGET_ID;
		} else {
			const first = this.targets.keys().next().value;
			this.selectedId = first ?? LAB_TARGET_ID;
		}
	}

	list(): TdTarget[] {
		return [...this.targets.values()].map((t) => ({ ...t }));
	}

	get(id: string): TdTarget | undefined {
		const t = this.targets.get(id);
		return t ? { ...t } : undefined;
	}

	getSelected(): TdTarget {
		const t = this.targets.get(this.selectedId);
		if (!t) {
			throw new Error(`Selected target "${this.selectedId}" is missing`);
		}
		return { ...t };
	}

	getSelectedId(): string {
		return this.selectedId;
	}

	select(id: string): TdTarget {
		const t = this.targets.get(id);
		if (!t) {
			throw new Error(
				`Unknown target "${id}". Use list_td_targets to see available ids.`,
			);
		}
		this.selectedId = id;
		return { ...t };
	}

	/** Select and persist sticky on hub when attached. */
	async selectAsync(id: string): Promise<TdTarget> {
		if (this.hub) {
			await this.syncFromHub();
			if (!this.targets.has(id)) {
				throw new Error(
					`Unknown target "${id}". Use list_td_targets to see available ids.`,
				);
			}
			const onHub = (await this.hub.listPeers()).peers.some((p) => p.id === id);
			if (onHub) {
				await this.hub.select(id);
			}
			this.selectedId = id;
			return this.getSelected();
		}
		return this.select(id);
	}

	upsertOwned(target: Omit<TdTarget, "source"> & { source?: "owned" }): TdTarget {
		if (target.id === LAB_TARGET_ID) {
			throw new Error(`Cannot overwrite builtin target "${LAB_TARGET_ID}"`);
		}
		const entry: TdTarget = {
			...target,
			host: normalizeHost(target.host),
			source: "owned",
		};
		this.targets.set(entry.id, entry);
		return { ...entry };
	}

	/** Upsert owned and register on hub when attached. */
	async upsertOwnedAsync(
		target: Omit<TdTarget, "source"> & { source?: "owned" },
	): Promise<TdTarget> {
		const entry = this.upsertOwned(target);
		if (this.hub) {
			await this.hub.register(targetToPeer(entry));
			await this.syncFromHub();
			return this.get(entry.id) ?? entry;
		}
		return entry;
	}

	removeOwned(id: string): void {
		if (id === LAB_TARGET_ID) {
			throw new Error(`Cannot remove builtin target "${LAB_TARGET_ID}"`);
		}
		this.targets.delete(id);
		if (this.selectedId === id) {
			this.selectedId = LAB_TARGET_ID;
		}
	}

	async removeOwnedAsync(id: string): Promise<void> {
		if (id === LAB_TARGET_ID) {
			throw new Error(`Cannot remove builtin target "${LAB_TARGET_ID}"`);
		}
		this.targets.delete(id);
		if (this.hub) {
			try {
				await this.hub.removePeer(id);
			} catch {
				// peer may already be gone
			}
			await this.syncFromHub();
		}
		if (this.selectedId === id) {
			this.selectedId = this.targets.has(LAB_TARGET_ID)
				? LAB_TARGET_ID
				: (this.targets.keys().next().value ?? LAB_TARGET_ID);
		}
	}

	asOrigin(target: TdTarget): TargetOrigin {
		return {
			host: normalizeHost(target.host),
			id: target.id,
			port: target.port,
		};
	}
}

/** Singleton used by the stdio MCP process. */
let defaultRegistry: TargetRegistry | undefined;

export function getTargetRegistry(): TargetRegistry {
	if (!defaultRegistry) {
		defaultRegistry = new TargetRegistry({
			host: process.env.TD_WEB_SERVER_HOST,
			port: Number.parseInt(process.env.TD_WEB_SERVER_PORT || "9981", 10),
		});
	}
	return defaultRegistry;
}

export function resetTargetRegistryForTests(reg?: TargetRegistry): void {
	defaultRegistry = reg;
}

/** Attach default hub client after ensureHub. */
export function attachDefaultHub(client?: HubClient): TargetRegistry {
	const reg = getTargetRegistry();
	reg.attachHub(client ?? getHubClient());
	return reg;
}

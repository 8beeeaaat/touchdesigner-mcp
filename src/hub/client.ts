import { defaultHubBaseUrl } from "./constants.js";
import type { HubPeer } from "./types.js";

export type HubPeersResponse = {
	peers: HubPeer[];
	selectedId: string | null;
};

export type HubStickyResponse = {
	selectedId: string | null;
	peer: HubPeer | null;
};

/**
 * HTTP client for tdmcp-hub.
 */
export class HubClient {
	readonly baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl = (
			baseUrl ??
			process.env.TDMCP_HUB_URL ??
			defaultHubBaseUrl()
		).replace(/\/$/, "");
	}

	private async json<T>(
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		const res = await fetch(`${this.baseUrl}${path}`, {
			body: body === undefined ? undefined : JSON.stringify(body),
			headers:
				body === undefined
					? undefined
					: { "content-type": "application/json" },
			method,
			signal: AbortSignal.timeout(5_000),
		});
		const text = await res.text();
		let data: unknown = null;
		if (text) {
			try {
				data = JSON.parse(text);
			} catch {
				data = { raw: text };
			}
		}
		if (!res.ok) {
			throw new Error(
				`hub ${method} ${path} → ${res.status}: ${typeof data === "object" ? JSON.stringify(data) : text}`,
			);
		}
		return data as T;
	}

	health(): Promise<{ app: string; ok: boolean; version: string }> {
		return this.json("GET", "/health");
	}

	listPeers(): Promise<HubPeersResponse> {
		return this.json("GET", "/peers");
	}

	register(peer: HubPeer): Promise<{ peer: HubPeer; selectedId: string | null }> {
		return this.json("POST", "/peers/register", peer);
	}

	heartbeat(id: string): Promise<{ peer: HubPeer }> {
		return this.json("POST", "/peers/heartbeat", { id });
	}

	removePeer(id: string): Promise<{ ok: true; selectedId: string | null }> {
		return this.json("DELETE", `/peers/${encodeURIComponent(id)}`);
	}

	getSticky(): Promise<HubStickyResponse> {
		return this.json("GET", "/sticky");
	}

	select(id: string): Promise<HubStickyResponse> {
		return this.json("PUT", "/sticky", { id });
	}
}

let defaultClient: HubClient | undefined;

export function getHubClient(baseUrl?: string): HubClient {
	if (baseUrl) return new HubClient(baseUrl);
	if (!defaultClient) {
		defaultClient = new HubClient();
	}
	return defaultClient;
}

export function resetHubClientForTests(): void {
	defaultClient = undefined;
}

import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import type { HubPeer } from "./types.js";

export type HubSnapshot = {
	version: 1;
	selectedId: string | null;
	peers: HubPeer[];
	savedAt: string;
};

export function defaultHubSnapshotPath(): string {
	return join(tmpdir(), "tdmcp-hub-state.json");
}

export function loadHubSnapshot(
	path = defaultHubSnapshotPath(),
): HubSnapshot | null {
	if (!existsSync(path)) return null;
	try {
		const raw = JSON.parse(readFileSync(path, "utf8")) as HubSnapshot;
		if (raw?.version !== 1 || !Array.isArray(raw.peers)) return null;
		return raw;
	} catch {
		return null;
	}
}

export function saveHubSnapshot(
	snapshot: Omit<HubSnapshot, "version" | "savedAt">,
	path = defaultHubSnapshotPath(),
): void {
	const dir = dirname(path);
	mkdirSync(dir, { recursive: true });
	const full: HubSnapshot = {
		version: 1,
		selectedId: snapshot.selectedId,
		peers: snapshot.peers,
		savedAt: new Date().toISOString(),
	};
	const tmp = `${path}.tmp`;
	writeFileSync(tmp, `${JSON.stringify(full, null, 2)}\n`);
	renameSync(tmp, path);
}

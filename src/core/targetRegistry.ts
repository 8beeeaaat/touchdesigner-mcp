import {
	LAB_TARGET_ID,
	normalizeHost,
	type TdTarget,
	type TargetOrigin,
} from "./targetTypes.js";

/**
 * Process-wide sticky target registry.
 * Builtin `lab` always exists; owned targets are added by lifecycle tools.
 */
export class TargetRegistry {
	private readonly targets = new Map<string, TdTarget>();
	private selectedId: string = LAB_TARGET_ID;

	constructor(lab?: Partial<Pick<TdTarget, "host" | "port" | "label">>) {
		const host = normalizeHost(lab?.host || "http://127.0.0.1");
		const port = lab?.port ?? 9981;
		this.targets.set(LAB_TARGET_ID, {
			host,
			id: LAB_TARGET_ID,
			label: lab?.label || "Lab (default :9981)",
			port,
			source: "builtin",
		});
		this.selectedId = LAB_TARGET_ID;
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

	removeOwned(id: string): void {
		if (id === LAB_TARGET_ID) {
			throw new Error(`Cannot remove builtin target "${LAB_TARGET_ID}"`);
		}
		this.targets.delete(id);
		if (this.selectedId === id) {
			this.selectedId = LAB_TARGET_ID;
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

export type TargetSource = "builtin" | "owned";

export type TdTarget = {
	id: string;
	host: string;
	port: number;
	label: string;
	source: TargetSource;
	/** Absolute path to .toe when owned */
	toePath?: string;
	/** Project folder containing .tdmcp/state.json */
	projectDir?: string;
};

export type TargetOrigin = {
	id: string;
	host: string;
	port: number;
};

export const LAB_TARGET_ID = "lab";

export function normalizeHost(host: string): string {
	const trimmed = host.trim().replace(/\/$/, "");
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}
	return `http://${trimmed}`;
}

export function targetOrigin(target: Pick<TdTarget, "host" | "port">): string {
	return `${normalizeHost(target.host)}:${target.port}`;
}

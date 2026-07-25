export type TargetSource = "builtin" | "owned";

export type TargetTransport = "http" | "tunnel";

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
	transport?: TargetTransport;
	nonce?: string;
	/** Hub base URL when transport=tunnel (default http://127.0.0.1:9980) */
	hubUrl?: string;
	tunnelConnected?: boolean;
};

export type TargetOrigin = {
	id: string;
	host: string;
	port: number;
	transport?: TargetTransport;
	hubUrl?: string;
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

export function defaultHubUrl(): string {
	return (
		process.env.TDMCP_HUB_URL || "http://127.0.0.1:9980"
	).replace(/\/$/, "");
}

/** HTTP origin used by axios rewrite (direct peer or hub proxy). */
export function resolveOriginUrl(origin: TargetOrigin): string {
	const transport = origin.transport ?? (origin.port === 0 ? "tunnel" : "http");
	if (transport === "tunnel") {
		const hub = (origin.hubUrl || defaultHubUrl()).replace(/\/$/, "");
		return `${hub}/proxy/${encodeURIComponent(origin.id)}`;
	}
	return `${normalizeHost(origin.host)}:${origin.port}`;
}

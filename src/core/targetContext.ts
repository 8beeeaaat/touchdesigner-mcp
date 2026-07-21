import { AsyncLocalStorage } from "node:async_hooks";
import type { TargetOrigin } from "./targetTypes.js";
import { normalizeHost } from "./targetTypes.js";

const store = new AsyncLocalStorage<TargetOrigin>();

export function getRequestTarget(): TargetOrigin | undefined {
	return store.getStore();
}

export function runWithTarget<T>(
	origin: TargetOrigin,
	fn: () => T | Promise<T>,
): T | Promise<T> {
	return store.run(
		{
			host: normalizeHost(origin.host),
			id: origin.id,
			port: origin.port,
		},
		fn,
	);
}

/** Resolve HTTP origin for the current call (ALS → env fallback). */
export function resolveRequestOrigin(): { id: string; origin: string } {
	const current = store.getStore();
	if (current) {
		return {
			id: current.id,
			origin: `${normalizeHost(current.host)}:${current.port}`,
		};
	}
	const host = normalizeHost(
		process.env.TD_WEB_SERVER_HOST || "http://127.0.0.1",
	);
	const port = Number.parseInt(process.env.TD_WEB_SERVER_PORT || "9981", 10);
	return { id: "lab", origin: `${host}:${port}` };
}

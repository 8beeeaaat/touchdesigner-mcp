import { AsyncLocalStorage } from "node:async_hooks";

const queues = new Map<string, Promise<unknown>>();
const holding = new AsyncLocalStorage<string>();

/**
 * Serialize async work per target id (TD WebServer is not high-QPS).
 * Re-entrant for the same targetId (nested calls do not deadlock).
 */
export async function withTargetQueue<T>(
	targetId: string,
	fn: () => Promise<T>,
): Promise<T> {
	if (holding.getStore() === targetId) {
		return fn();
	}

	const previous = queues.get(targetId) ?? Promise.resolve();
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const chained = previous.then(() => gate);
	queues.set(
		targetId,
		chained.catch(() => undefined),
	);
	await previous.catch(() => undefined);
	try {
		return await holding.run(targetId, fn);
	} finally {
		release();
	}
}

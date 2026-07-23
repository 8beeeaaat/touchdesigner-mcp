import type { ExpandResult } from "./expandCache.js";

export type ExpandLocator = {
	cacheKey: string;
	expandDir: string;
	tocPath: string;
	cacheHit: boolean;
};

export function toExpandLocator(expanded: ExpandResult): ExpandLocator {
	return {
		cacheHit: expanded.cacheHit,
		cacheKey: expanded.cacheKey,
		expandDir: expanded.expandDir,
		tocPath: expanded.tocPath,
	};
}

/** Best-effort live TD path hint from expand-relative path. */
export function suggestedOpPath(expandRel: string): string {
	const clean = expandRel.replace(/^[/\\]+/, "").replace(/\\/g, "/");
	return `/${clean}`;
}

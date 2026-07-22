/**
 * Resolve how deep walkers may go.
 *
 * - No `path`: `maxDepth` is absolute from expand root (legacy).
 * - With `path`: `maxDepth` means levels *below* that path (agent-facing).
 *   Optional `relativeDepth` overrides the levels-below count when set.
 */
export function resolveWalkMaxDepth(
	pathFilter: string | undefined,
	maxDepth: number,
	relativeDepth?: number,
): {
	walkMaxDepth: number;
	pathDepth: number;
	relativeToPath: boolean;
} {
	const filterNorm = pathFilter
		? pathFilter.replace(/^[/\\]+/, "").replace(/\\/g, "/")
		: "";
	const pathDepth = filterNorm
		? filterNorm.split("/").filter(Boolean).length
		: 0;

	if (!filterNorm) {
		return {
			pathDepth: 0,
			relativeToPath: false,
			walkMaxDepth: maxDepth,
		};
	}

	const levelsBelow = relativeDepth !== undefined ? relativeDepth : maxDepth;
	return {
		pathDepth,
		relativeToPath: true,
		walkMaxDepth: pathDepth + Math.max(0, levelsBelow),
	};
}

export function pathDepthOf(rel: string): number {
	return rel
		.replace(/^[/\\]+/, "")
		.split("/")
		.filter(Boolean).length;
}

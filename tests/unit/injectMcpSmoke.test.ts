/**
 * Smoke: inject_td_mcp against a real community .toe when toeexpand/toecollapse exist.
 * Skips when TD tools or fixture toe are unavailable.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { injectTdMcp, InjectTdMcpError } from "../../src/toe/injectMcp.js";
import { tryFindToeexpand } from "../../src/toe/toeTools.js";

const repoRoot = resolve(
	fileURLToPath(new URL("../..", import.meta.url)),
	"../..",
);

const candidateToes = [
	join(
		repoRoot,
		"docs/td-technics/raw/derivative.ca/community/asset/61061_box-steroids-custom-fillet-tox/downloads/box_fillet_01a.toe",
	),
	join(
		repoRoot,
		"docs/td-technics/raw/derivative.ca/community/asset/71010_uv-wall-extrusion-tool/downloads/sop to wall technique.toe",
	),
];

const sourceToe = candidateToes.find((p) => existsSync(p));
const hasTools = Boolean(tryFindToeexpand());

const temps: string[] = [];

afterAll(() => {
	for (const d of temps) {
		try {
			rmSync(d, { force: true, recursive: true });
		} catch {
			/* ignore */
		}
	}
});

describe.runIf(Boolean(sourceToe) && hasTools)("injectTdMcp smoke", () => {
	it(
		"injects bridge into foreign toe and supports replace via second destDir",
		async () => {
			const destA = mkdtempSync(join(tmpdir(), "tdmcp-inject-a-"));
			temps.push(destA);
			rmSync(destA, { force: true, recursive: true });

			const first = await injectTdMcp({
				destDir: destA,
				toePath: sourceToe as string,
			});
			expect(first.action).toBe("injected");
			expect(existsSync(first.toePath)).toBe(true);
			expect(existsSync(join(destA, "modules"))).toBe(true);
			expect(existsSync(join(destA, ".tdmcp", "state.json"))).toBe(true);
			// No bridge tox at project root — collides with an embedded COMP name.
			// Runtime inject stages it under modules/ for loadTox on open.
			expect(existsSync(join(destA, "tdmcp_bridge.tox"))).toBe(false);
			expect(existsSync(join(destA, "mcp_webserver_base.tox"))).toBe(
				false,
			);
			expect(
				existsSync(join(destA, "modules", "tdmcp_bridge.tox")),
			).toBe(true);
			expect(
				first.warnings.some((w) => w === "runtimeBridge:loadTox"),
			).toBe(true);
			if (first.sourceBuild) {
				expect(
					first.warnings.some((w) => w.startsWith("buildSynced:")),
				).toBe(true);
			}

			// Default abort on already-bridged source (use first result as source)
			const destAbort = mkdtempSync(join(tmpdir(), "tdmcp-inject-abort-"));
			temps.push(destAbort);
			rmSync(destAbort, { force: true, recursive: true });
			await expect(
				injectTdMcp({
					destDir: destAbort,
					toePath: first.toePath,
				}),
			).rejects.toBeInstanceOf(InjectTdMcpError);

			const destB = mkdtempSync(join(tmpdir(), "tdmcp-inject-b-"));
			temps.push(destB);
			rmSync(destB, { force: true, recursive: true });

			const replaced = await injectTdMcp({
				destDir: destB,
				onConflict: "replace",
				toePath: first.toePath,
			});
			expect(replaced.action).toBe("replaced");
			expect(existsSync(replaced.toePath)).toBe(true);

			const destSkip = mkdtempSync(join(tmpdir(), "tdmcp-inject-skip-"));
			temps.push(destSkip);
			rmSync(destSkip, { force: true, recursive: true });
			const skipped = await injectTdMcp({
				destDir: destSkip,
				onConflict: "skip",
				toePath: first.toePath,
			});
			expect(skipped.action).toBe("skipped");
		},
		180_000,
	);
});

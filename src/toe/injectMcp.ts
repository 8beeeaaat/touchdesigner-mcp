import { randomUUID } from "node:crypto";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
	templateRoot,
	writeState,
	type TdMcpState,
} from "../core/lifecycle.js";
import { allocateTdMcpPort } from "../core/portAllocator.js";
import type { TdTarget } from "../core/targetTypes.js";
import {
	collapseToeInPlace,
	expandToeInPlace,
} from "./collapseToe.js";
import {
	assertGraftClean,
	assertManifestPresent,
	BRIDGE_TOX_SIDECAR,
	BRIDGE_TOX_SOURCE_NAMES,
	copyGraftKit,
	detectBridgeConflict,
	ensureGraftKit,
	filterOnstartPaths,
	mergeTocEntries,
	MODULES_BRIDGE_TOX_REL,
	modulesBridgeToxPath,
	patchOnstartText,
	readBuildVersion,
	syncBuildFromKit,
	syncExpectedNodesFromKit,
	wipeGraftOwned,
	type ConflictInfo,
} from "./graftManifest.js";
import { findToeTools } from "./toeTools.js";

export type OnConflict = "abort" | "skip" | "replace";

export type InjectTdMcpParams = {
	toePath: string;
	destDir: string;
	name?: string;
	port?: number;
	onConflict?: OnConflict;
	tdExe?: string;
	host?: string;
	timeoutMs?: number;
};

export type InjectTdMcpResult = {
	destDir: string;
	toePath: string;
	targetId: string;
	port: number;
	action: "injected" | "skipped" | "replaced";
	sourceBuild?: string;
	warnings: string[];
	conflict?: ConflictInfo;
	target: TdTarget;
};

export class InjectTdMcpError extends Error {
	readonly code: string;
	readonly conflict?: ConflictInfo;

	constructor(code: string, message: string, conflict?: ConflictInfo) {
		super(`${code}: ${message}`);
		this.name = "InjectTdMcpError";
		this.code = code;
		this.conflict = conflict;
	}
}

function dirNonEmpty(path: string): boolean {
	if (!existsSync(path)) return false;
	return readdirSync(path).length > 0;
}

function wipeDir(path: string): void {
	if (existsSync(path)) {
		rmSync(path, { force: true, recursive: true });
	}
}

/**
 * Stage modules + import_modules.py, and place the bridge tox under
 * `modules/tdmcp_bridge.tox` for runtime loadTox. Never leave a bridge
 * `.tox` in the project root (collides with an embedded COMP of that name).
 */
function stageSidecars(destDir: string): void {
	const src = templateRoot();
	for (const name of ["modules", "import_modules.py"] as const) {
		const from = join(src, name);
		const to = join(destDir, name);
		if (!existsSync(from)) {
			throw new InjectTdMcpError(
				"TEMPLATE_INCOMPLETE",
				`MCP template missing ${name} at ${from}`,
			);
		}
		cpSync(from, to, { recursive: true });
	}
	for (const name of BRIDGE_TOX_SOURCE_NAMES) {
		const tox = join(destDir, name);
		if (existsSync(tox)) {
			rmSync(tox, { force: true });
		}
	}
	const toxFrom = join(src, BRIDGE_TOX_SIDECAR);
	if (!existsSync(toxFrom)) {
		throw new InjectTdMcpError(
			"TEMPLATE_INCOMPLETE",
			`MCP template missing ${BRIDGE_TOX_SIDECAR} at ${toxFrom}`,
		);
	}
	const toxTo = modulesBridgeToxPath(destDir);
	mkdirSync(dirname(toxTo), { recursive: true });
	cpSync(toxFrom, toxTo);
}

function cleanupExpandArtifacts(destDir: string, toeStemPath: string): void {
	for (const p of [
		`${toeStemPath}.dir`,
		`${toeStemPath}.toc`,
		join(destDir, "_inject_verify"),
	]) {
		if (existsSync(p)) {
			rmSync(p, { force: true, recursive: true });
		}
	}
	for (const name of readdirSync(destDir)) {
		if (
			name.endsWith(".injecting.toe") ||
			name.endsWith(".injecting.toe.dir") ||
			name.endsWith(".injecting.toe.toc") ||
			name.includes("._foreign.")
		) {
			rmSync(join(destDir, name), { force: true, recursive: true });
		}
	}
}

/**
 * Stage a foreign `.toe` into an empty destDir, graft MCP onStart bootstrap
 * offline (bridge COMP is loadTox'd at TD open from modules/), write
 * `.tdmcp/state.json`. Does not start TouchDesigner or select a target.
 *
 * Embedding the full bridge COMP into community toes (or shell-host merging
 * their networks into the MCP template) triggers TD
 * "Unexpected node duplication … in file" dialogs. Runtime loadTox avoids that.
 */
export async function injectTdMcp(
	params: InjectTdMcpParams,
): Promise<InjectTdMcpResult> {
	const sourceToe = resolve(params.toePath);
	const destDir = resolve(params.destDir);
	const onConflict: OnConflict = params.onConflict ?? "abort";
	const warnings: string[] = [];
	let staged = false;

	const fail = (code: string, message: string, conflict?: ConflictInfo): never => {
		if (staged) {
			wipeDir(destDir);
		}
		throw new InjectTdMcpError(code, message, conflict);
	};

	try {
		if (!existsSync(sourceToe)) {
			throw new InjectTdMcpError(
				"SOURCE_MISSING",
				`toe not found: ${sourceToe}`,
			);
		}
		if (!sourceToe.toLowerCase().endsWith(".toe")) {
			throw new InjectTdMcpError(
				"SOURCE_NOT_TOE",
				`expected a .toe file: ${sourceToe}`,
			);
		}

		const sourceDir = resolve(dirname(sourceToe));
		if (destDir === sourceDir) {
			throw new InjectTdMcpError(
				"DEST_IS_SOURCE_DIR",
				"destDir must be a dedicated empty workspace, not the source toe directory",
			);
		}
		if (dirNonEmpty(destDir)) {
			throw new InjectTdMcpError(
				"DEST_NOT_EMPTY",
				`destination is not empty: ${destDir}`,
			);
		}

		const toolsProbe = findToeTools(params.tdExe);
		if (!toolsProbe.toecollapse) {
			throw new InjectTdMcpError(
				"TOECOLLAPSE_MISSING",
				`toecollapse not found beside TouchDesigner at ${toolsProbe.tdBinDir}`,
			);
		}

		const stem =
			params.name?.trim() ||
			basename(sourceToe).replace(/\.toe$/i, "") ||
			"project";
		const toeName = `${stem}.toe`;
		const workingToe = join(destDir, toeName);

		mkdirSync(destDir, { recursive: true });
		staged = true;

		stageSidecars(destDir);

		const port = params.port ?? (await allocateTdMcpPort());
		const kit = await ensureGraftKit({
			tdExe: params.tdExe,
			timeoutMs: params.timeoutMs,
		});
		const onstartPaths = filterOnstartPaths(kit.paths);
		if (onstartPaths.length === 0) {
			fail(
				"TEMPLATE_INCOMPLETE",
				"graft kit has no tdmcp_port_onstart paths",
			);
		}

		try {
			cpSync(sourceToe, workingToe);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (/EBUSY|EPERM|locked|sharing/i.test(msg)) {
				fail(
					"SOURCE_LOCKED",
					`could not copy source toe (file may be open in TouchDesigner): ${msg}`,
				);
			}
			fail("COPY_FAILED", msg);
		}

		const expanded = await expandToeInPlace({
			tdExe: params.tdExe,
			timeoutMs: params.timeoutMs,
			toePath: workingToe,
		});
		if (!existsSync(join(expanded.expandDir, "project1"))) {
			fail(
				"NO_PROJECT1",
				"expanded toe has no project1 container (v1 requires project1)",
			);
		}

		const sourceBuild = readBuildVersion(expanded.expandDir) ?? undefined;
		if (sourceBuild) {
			warnings.push(`sourceBuild:${sourceBuild}`);
		}

		const conflict = detectBridgeConflict(
			expanded.expandDir,
			kit.paths,
			destDir,
		);
		if (conflict.extraUnderStem.length > 0) {
			warnings.push(
				`extraUnderStem:${conflict.extraUnderStem.length}`,
			);
		}
		if (conflict.nameCollisions.length > 0) {
			warnings.push(
				`nameCollisions:${conflict.nameCollisions.join(",")}`,
			);
		}

		let action: InjectTdMcpResult["action"] = "injected";

		if (conflict.state === "full" && onConflict === "abort") {
			fail(
				"MCP_BRIDGE_EXISTS",
				"bridge already present; pass onConflict: \"skip\" or \"replace\"",
				conflict,
			);
		}
		if (conflict.state === "partial" && onConflict !== "replace") {
			fail(
				"MCP_BRIDGE_PARTIAL",
				"incomplete bridge detected; pass onConflict: \"replace\" to wipe and reinject",
				conflict,
			);
		}
		if (
			conflict.nameCollisions.length > 0 &&
			onConflict === "abort" &&
			conflict.state !== "absent"
		) {
			fail(
				"NODE_NAME_DUPLICATE",
				`conflicting bridge names: ${conflict.nameCollisions.join(", ")}; pass onConflict: \"replace\"`,
				conflict,
			);
		}

		if (conflict.state === "full" && onConflict === "skip") {
			action = "skipped";
			cleanupExpandArtifacts(destDir, workingToe);
		} else {
			action =
				conflict.state === "absent" &&
				conflict.nameCollisions.length === 0
					? "injected"
					: "replaced";
			warnings.push("runtimeBridge:loadTox");

			wipeGraftOwned(expanded.expandDir, expanded.tocPath, kit.paths);
			copyGraftKit(kit.kitExpandDir, expanded.expandDir, onstartPaths);
			mergeTocEntries(expanded.tocPath, onstartPaths);
			const buildSync = syncBuildFromKit(
				expanded.expandDir,
				kit.kitExpandDir,
			);
			if (buildSync.sourceBuild && buildSync.graftBuild) {
				warnings.push(
					`buildSynced:${buildSync.sourceBuild}->${buildSync.graftBuild}`,
				);
			}
			syncExpectedNodesFromKit(expanded.expandDir, kit.kitExpandDir);
			patchOnstartText(expanded.expandDir);

			try {
				assertGraftClean(
					expanded.expandDir,
					expanded.tocPath,
					destDir,
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				if (msg.startsWith("TOX_NAME_COLLISION")) {
					fail("TOX_NAME_COLLISION", msg, conflict);
				}
				if (msg.startsWith("NODE_NAME_DUPLICATE")) {
					fail("NODE_NAME_DUPLICATE", msg, conflict);
				}
				if (msg.startsWith("TOC_DUPLICATE")) {
					fail("TOC_DUPLICATE", msg, conflict);
				}
				fail("INJECT_VERIFY_FAILED", msg, conflict);
			}

			// Collapse in place (workingToe.dir + .toc). Avoid renaming the
			// expand tree to *.injecting.* — Windows often EPERM / leaves
			// toecollapse without its required .dir + .toc pair.
			rmSync(workingToe, { force: true });
			const collapsed = await collapseToeInPlace({
				expandDir: expanded.expandDir,
				tdExe: params.tdExe,
				timeoutMs: params.timeoutMs,
				outToePath: workingToe,
			});

			const verifyRoot = join(destDir, "_inject_verify");
			mkdirSync(verifyRoot, { recursive: true });
			const verifyToe = join(verifyRoot, "check.toe");
			cpSync(collapsed.toePath, verifyToe);
			const verified = await expandToeInPlace({
				tdExe: params.tdExe,
				timeoutMs: params.timeoutMs,
				toePath: verifyToe,
			});
			const missing = assertManifestPresent(
				verified.expandDir,
				onstartPaths,
			);
			if (missing.length > 0) {
				fail(
					"INJECT_VERIFY_FAILED",
					`re-expand missing onStart paths: ${missing.slice(0, 8).join(", ")}`,
				);
			}
			if (!existsSync(join(verified.expandDir, ".build"))) {
				fail("INJECT_VERIFY_FAILED", "re-expand missing .build");
			}
			if (!existsSync(modulesBridgeToxPath(destDir))) {
				fail(
					"INJECT_VERIFY_FAILED",
					`missing ${MODULES_BRIDGE_TOX_REL} for runtime loadTox`,
				);
			}
			// Bridge COMP must NOT be embedded — that is what triggers foreign-toe dialogs.
			if (
				existsSync(
					join(verified.expandDir, "project1", "tdmcp_bridge.n"),
				) ||
				existsSync(
					join(verified.expandDir, "project1", "tdmcp_bridge"),
				)
			) {
				fail(
					"INJECT_VERIFY_FAILED",
					"bridge COMP was embedded; expected runtime loadTox only",
				);
			}
			try {
				assertGraftClean(
					verified.expandDir,
					`${verifyToe}.toc`,
					destDir,
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				fail("INJECT_VERIFY_FAILED", `post-collapse: ${msg}`);
			}

			cleanupExpandArtifacts(destDir, workingToe);
			wipeDir(verifyRoot);
		}

		const targetId = `owned-${randomUUID().slice(0, 8)}`;
		const host = params.host || "http://127.0.0.1";
		const state: TdMcpState = {
			host,
			hubUrl: process.env.TDMCP_HUB_URL || "http://127.0.0.1:9980",
			port,
			targetId,
			toe_launched: workingToe,
		};
		writeState(destDir, state);

		const target: TdTarget = {
			host,
			id: targetId,
			label: `Owned ${toeName}`,
			port,
			projectDir: destDir,
			source: "owned",
			toePath: workingToe,
		};

		return {
			action,
			conflict:
				conflict.state === "absent" ? undefined : conflict,
			destDir,
			port,
			sourceBuild,
			target,
			targetId,
			toePath: workingToe,
			warnings,
		};
	} catch (err) {
		if (err instanceof InjectTdMcpError) {
			if (staged && err.code !== "DEST_NOT_EMPTY") {
				wipeDir(destDir);
			}
			throw err;
		}
		if (staged) {
			wipeDir(destDir);
		}
		throw err;
	}
}

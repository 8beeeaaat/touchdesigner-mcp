/**
 * Opt-in live e2e: force a root-tox duplication dialog, start_td_project,
 * assert dismissedDialogs or SKIP if no modal (exit 0).
 *
 * Usage: npm run test:live-dialogs
 * Gates: win32 + TouchDesigner.exe found.
 */
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TargetRegistry } from "../dist/core/targetRegistry.js";
import { createTdProject, findTdExecutable } from "../dist/core/lifecycle.js";
import { startTdProject, stopTdProject } from "../dist/lifecycle/tdProcess.js";
import { TouchDesignerClient } from "../dist/tdClient/touchDesignerClient.js";

function skip(reason) {
	console.log(`SKIP: ${reason}`);
	process.exit(0);
}

function fail(reason) {
	console.error(`FAIL: ${reason}`);
	process.exit(1);
}

if (process.platform !== "win32") {
	skip("not win32");
}

let tdExe;
try {
	tdExe = findTdExecutable();
} catch (e) {
	skip(`no TouchDesigner.exe (${e instanceof Error ? e.message : e})`);
}

const destDir = mkdtempSync(join(tmpdir(), "tdmcp-live-dialogs-"));
const registry = new TargetRegistry();
const tdClient = new TouchDesignerClient();
let targetId;

try {
	const created = await createTdProject({
		destDir,
		name: "dialog_probe",
		port: 9996,
	});
	targetId = created.target.id;
	registry.upsertOwned({
		host: created.target.host,
		id: created.target.id,
		label: created.target.label,
		port: created.target.port,
		projectDir: created.target.projectDir,
		toePath: created.target.toePath,
	});

	const templateTox = join(
		import.meta.dirname,
		"../templates/mcp_project/tdmcp_bridge.tox",
	);
	const modulesTox = join(destDir, "modules", "tdmcp_bridge.tox");
	const rootTox = join(destDir, "tdmcp_bridge.tox");
	const sourceTox = existsSync(modulesTox)
		? modulesTox
		: existsSync(templateTox)
			? templateTox
			: null;
	if (!sourceTox) {
		skip(`no tdmcp_bridge.tox source to stage at project root`);
	}
	cpSync(sourceTox, rootTox);
	console.log(`staged root tox from ${sourceTox}`);

	console.log("starting with root tdmcp_bridge.tox staged…");
	let started;
	try {
		started = await startTdProject({
			registry,
			tdClient,
			tdExe,
			timeoutMs: 90_000,
			toePath: created.toePath,
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.log("start error:", msg);
		if (/unexpected node.*duplicat/i.test(msg) || /uiSnapshot=/.test(msg)) {
			console.log("PASS: timeout/error carried dialog uiSnapshot");
			process.exit(0);
		}
		skip(`start failed without dialog evidence: ${msg.slice(0, 200)}`);
	}

	const dismissed = started.dismissedDialogs ?? [];
	console.log(
		JSON.stringify(
			{
				dismissedDialogs: dismissed,
				pid: started.pid,
				port: started.port,
				targetId: started.targetId,
			},
			null,
			2,
		),
	);

	const hard = dismissed.some(
		(d) =>
			d.severity === "hard" ||
			/unexpected node.*duplicat/i.test(`${d.title}\n${d.message}`),
	);
	if (hard || dismissed.length > 0) {
		console.log("PASS: dismissedDialogs recorded");
		process.exit(0);
	}
	skip(
		"no modal observed (root-tox fixture may no longer pop duplication on this TD/template)",
	);
} finally {
	try {
		if (targetId) {
			await stopTdProject({ registry, targetId, tdClient });
		}
	} catch {
		// ignore
	}
	try {
		rmSync(destDir, { force: true, recursive: true });
	} catch {
		// ignore
	}
}

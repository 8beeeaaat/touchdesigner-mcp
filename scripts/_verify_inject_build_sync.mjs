import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { TargetRegistry } from "../dist/core/targetRegistry.js";
import { startTdProject } from "../dist/lifecycle/tdProcess.js";
import { TouchDesignerClient } from "../dist/tdClient/touchDesignerClient.js";
import { expandToeInPlace } from "../dist/toe/collapseToe.js";
import { readBuildVersion } from "../dist/toe/graftManifest.js";
import { injectTdMcp } from "../dist/toe/injectMcp.js";

const destDir = join(
	import.meta.dirname,
	"../../../docs/td-technics/sandbox/interactive_snow_fix_verify",
);
const toePath = join(
	import.meta.dirname,
	"../../../docs/td-technics/raw/github.com/repos/marimeireles/touchdesigner-toes/downloads/interactive_snow.toe",
);

if (existsSync(destDir)) {
	rmSync(destDir, { force: true, recursive: true });
}

const result = await injectTdMcp({ destDir, port: 9988, toePath });
const names = readdirSync(destDir);
const toxes = names.filter((n) => n.toLowerCase().endsWith(".tox"));
console.log(
	JSON.stringify(
		{
			action: result.action,
			port: result.port,
			toePath: result.toePath,
			toxes,
			warnings: result.warnings,
		},
		null,
		2,
	),
);

if (toxes.length > 0) {
	console.error("FAIL: bridge tox staged beside toe:", toxes);
	process.exit(2);
}

const { expandDir } = await expandToeInPlace({ toePath: result.toePath });
const build = readBuildVersion(expandDir);
const parm = (
	await import("node:fs")
).readFileSync(join(expandDir, "project1", "tdmcp_bridge.parm"), "utf8");
console.log("post-inject .build =", build);
console.log("parm snippet:\n", parm);
rmSync(expandDir, { force: true, recursive: true });
try {
	rmSync(`${result.toePath}.toc`, { force: true });
} catch {
	/* ignore */
}

if (parm.includes("tdmcp_bridge.tox") || parm.includes("mcp_webserver_base.tox")) {
	console.error("FAIL: externaltox still points at a tox");
	process.exit(3);
}
if (!/^externaltox 17 "" ""$/m.test(parm)) {
	console.error("FAIL: externaltox not cleared");
	process.exit(3);
}

const registry = new TargetRegistry();
const tdClient = new TouchDesignerClient();
const started = await startTdProject({
	registry,
	tdClient,
	timeoutMs: 90_000,
	toePath: result.toePath,
});
console.log(
	JSON.stringify(
		{
			identity: started.identity,
			port: started.port,
			started: true,
			targetId: started.targetId,
		},
		null,
		2,
	),
);

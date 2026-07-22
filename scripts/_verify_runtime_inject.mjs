import { existsSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { findTdExecutable } from "../dist/core/lifecycle.js";
import { injectTdMcp } from "../dist/toe/injectMcp.js";
import { startTdProject } from "../dist/lifecycle/tdProcess.js";
import { TargetRegistry } from "../dist/core/targetRegistry.js";
import { TouchDesignerClient } from "../dist/tdClient/touchDesignerClient.js";

const rawToe = join(
	import.meta.dirname,
	"../../../docs/td-technics/raw/github.com/repos/marimeireles/touchdesigner-toes/downloads/interactive_snow.toe",
);
const destDir = join(
	import.meta.dirname,
	"../../../docs/td-technics/sandbox/runtime_inject_verify",
);
const tdExe = findTdExecutable();

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function detectDupDialog(toePath) {
	const child = spawn(tdExe, [toePath], { stdio: "ignore", windowsHide: false });
	await sleep(12000);
	const ps = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$root=[System.Windows.Automation.AutomationElement]::RootElement
$cond=New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::ProcessIdProperty), ${child.pid}
$dup=$false; $msg=''
foreach ($w in $root.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)) {
  foreach ($d in $w.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
    if ($d.Current.Name -match 'Unexpected|duplicat') { $dup=$true; $msg=$d.Current.Name }
  }
}
Write-Output ("dup=" + $dup + " msg=" + $msg)
`;
	const out = await new Promise((resolve) => {
		const p = spawn("powershell", ["-NoProfile", "-Command", ps], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let s = "";
		p.stdout.on("data", (d) => {
			s += d.toString();
		});
		p.on("close", () => resolve(s.trim()));
	});
	try {
		process.kill(child.pid);
	} catch {
		/* ignore */
	}
	await sleep(2000);
	return out;
}

if (existsSync(destDir)) rmSync(destDir, { force: true, recursive: true });

const result = await injectTdMcp({ destDir, port: 9993, toePath: rawToe });
console.log(
	JSON.stringify(
		{
			action: result.action,
			port: result.port,
			warnings: result.warnings,
			bytes: statSync(result.toePath).size,
			modulesTox: existsSync(join(destDir, "modules", "tdmcp_bridge.tox")),
			rootTox: existsSync(join(destDir, "tdmcp_bridge.tox")),
		},
		null,
		2,
	),
);

const dialog = await detectDupDialog(result.toePath);
console.log("open dialog:", dialog);
if (dialog.includes("dup=True")) {
	console.error("FAIL: duplication dialog still present");
	process.exit(2);
}

const registry = new TargetRegistry();
const tdClient = new TouchDesignerClient();
const started = await startTdProject({
	registry,
	tdClient,
	timeoutMs: 90_000,
	toePath: result.toePath,
});
const info = await tdClient.getTdInfo();
console.log(
	JSON.stringify(
		{ startedPort: started.port, targetId: started.targetId, info },
		null,
		2,
	),
);
console.log("OK: no dialog + MCP reachable");

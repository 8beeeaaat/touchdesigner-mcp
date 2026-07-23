/**
 * Windows TD UI dialog inspect/dismiss (PowerShell UIAutomation + #32770).
 * Non-Windows: empty inspect; dismiss returns dismissed:false.
 */
import { spawn } from "node:child_process";

export type DialogSeverity = "hard" | "soft" | "unknown";

export type TdUiDialog = {
	title: string;
	message: string;
	severity: DialogSeverity;
};

export type TdUiInspectResult = {
	dialogs: TdUiDialog[];
	responding: boolean;
	mainWindowTitle: string | null;
	inspectTimedOut?: boolean;
};

export type DismissResult = {
	dismissed: boolean;
	title: string;
};

const INSPECT_TIMEOUT_MS = 2000;
const DISMISS_TIMEOUT_MS = 2000;

/** Soft titles (Gate5 allowlist). Empty until soft path validated. */
export const SOFT_DIALOG_TITLE_RE = /Backwards Compatiblity Issue/i;

const HARD_DIALOG_RE = /unexpected node(?: name)?\s+duplicat/i;

const BLOCKED_DISMISS_TITLES = new Set(["", "touchdesigner"]);

export function classifyDialog(title: string, message: string): DialogSeverity {
	const blob = `${title}\n${message}`;
	if (HARD_DIALOG_RE.test(blob)) {
		return "hard";
	}
	if (SOFT_DIALOG_TITLE_RE.test(title) || SOFT_DIALOG_TITLE_RE.test(message)) {
		return "soft";
	}
	return "unknown";
}

export function isDismissBlockedTitle(title: string): boolean {
	const t = title.trim();
	if (!t) {
		return true;
	}
	const lower = t.toLowerCase();
	if (BLOCKED_DISMISS_TITLES.has(lower)) {
		return true;
	}
	// Main editor chrome: "TouchDesigner 2025.…: path/to.toe"
	if (/^touchdesigner(\s|$)/i.test(t) && !t.startsWith("/")) {
		return true;
	}
	return false;
}

export function parseInspectJson(raw: string): TdUiInspectResult {
	const trimmed = raw.trim();
	if (!trimmed) {
		return {
			dialogs: [],
			mainWindowTitle: null,
			responding: true,
		};
	}
	let parsed: {
		dialogs?: Array<{ title?: string; message?: string }>;
		responding?: boolean;
		mainWindowTitle?: string | null;
	};
	try {
		parsed = JSON.parse(trimmed) as typeof parsed;
	} catch {
		return {
			dialogs: [],
			mainWindowTitle: null,
			responding: true,
		};
	}
	const dialogs: TdUiDialog[] = [];
	for (const d of parsed.dialogs ?? []) {
		const title = String(d.title ?? "").trim();
		if (!title || isDismissBlockedTitle(title)) {
			continue;
		}
		const message = String(d.message ?? "").trim();
		dialogs.push({
			message,
			severity: classifyDialog(title, message),
			title,
		});
	}
	return {
		dialogs,
		mainWindowTitle:
			parsed.mainWindowTitle != null && parsed.mainWindowTitle !== ""
				? String(parsed.mainWindowTitle)
				: null,
		responding: parsed.responding !== false,
	};
}

export function dedupeDialogs(dialogs: TdUiDialog[]): TdUiDialog[] {
	const seen = new Set<string>();
	const out: TdUiDialog[] = [];
	for (const d of dialogs) {
		const key = `${d.title}\0${d.message}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		out.push(d);
	}
	return out;
}

type RunPs = (
	script: string,
	timeoutMs: number,
) => Promise<{ stdout: string; timedOut: boolean }>;

let runPowershellImpl: RunPs = runPowershellDefault;

/** Test seam */
export function setPowershellRunnerForTests(runner: RunPs | null): void {
	runPowershellImpl = runner ?? runPowershellDefault;
}

async function runPowershellDefault(
	script: string,
	timeoutMs: number,
): Promise<{ stdout: string; timedOut: boolean }> {
	if (process.platform !== "win32") {
		return { stdout: "", timedOut: false };
	}
	return new Promise((resolvePromise) => {
		const child = spawn(
			"powershell.exe",
			[
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-Command",
				script,
			],
			{
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			},
		);
		let stdout = "";
		let settled = false;
		const finish = (timedOut: boolean) => {
			if (settled) {
				return;
			}
			settled = true;
			resolvePromise({ stdout, timedOut });
		};
		const timer = setTimeout(() => {
			try {
				child.kill("SIGKILL");
			} catch {
				// ignore
			}
			finish(true);
		}, timeoutMs);
		child.stdout?.on("data", (chunk: Buffer) => {
			stdout += chunk.toString("utf8");
		});
		child.on("error", () => {
			clearTimeout(timer);
			finish(false);
		});
		child.on("close", () => {
			clearTimeout(timer);
			finish(false);
		});
	});
}

function inspectScript(pid: number): string {
	// Keep tiny: UIA children of PID + process Responding/title
	return `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName UIAutomationClient | Out-Null
Add-Type -AssemblyName UIAutomationTypes | Out-Null
$pidTarget = ${pid}
$proc = Get-Process -Id $pidTarget -ErrorAction SilentlyContinue
$responding = $true
$title = ''
if ($proc) { $responding = [bool]$proc.Responding; $title = [string]$proc.MainWindowTitle }
$root = [System.Windows.Automation.AutomationElement]::RootElement
$cond = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::ProcessIdProperty), $pidTarget
$dialogs = New-Object System.Collections.Generic.List[object]
foreach ($w in $root.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)) {
  $name = [string]$w.Current.Name
  if (-not $name) { continue }
  if ($name -eq 'TouchDesigner') { continue }
  if ($name -like 'TouchDesigner *') { continue }
  $msgs = New-Object System.Collections.Generic.List[string]
  foreach ($d in $w.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
    $dn = [string]$d.Current.Name
    if ($dn -and $dn.Length -gt 3 -and $dn -ne $name -and $dn -ne 'OK' -and $dn -ne 'Cancel') {
      [void]$msgs.Add($dn)
    }
  }
  $dialogs.Add(@{ title = $name; message = [string]::Join(' | ', $msgs) })
}
@{ responding = $responding; mainWindowTitle = $title; dialogs = $dialogs } | ConvertTo-Json -Compress -Depth 5
`.trim();
}

function dismissScript(title: string): string {
	const escaped = title.replace(/'/g, "''");
	return `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class TdMcpDlg {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public const uint WM_CLOSE = 0x0010;
  public const uint WM_KEYDOWN = 0x0100;
  public const uint VK_RETURN = 0x0D;
}
"@
$h = [TdMcpDlg]::FindWindow('#32770', '${escaped}')
if ($h -eq [IntPtr]::Zero) { Write-Output '{"dismissed":false}'; exit 0 }
[TdMcpDlg]::SetForegroundWindow($h) | Out-Null
[TdMcpDlg]::PostMessage($h, [TdMcpDlg]::WM_KEYDOWN, [IntPtr][TdMcpDlg]::VK_RETURN, [IntPtr]::Zero) | Out-Null
Start-Sleep -Milliseconds 400
[TdMcpDlg]::PostMessage($h, [TdMcpDlg]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
Write-Output '{"dismissed":true}'
`.trim();
}

export async function inspectTdUi(pid: number): Promise<TdUiInspectResult> {
	if (process.platform !== "win32" || !Number.isFinite(pid) || pid <= 0) {
		return {
			dialogs: [],
			mainWindowTitle: null,
			responding: true,
		};
	}
	const { stdout, timedOut } = await runPowershellImpl(
		inspectScript(pid),
		INSPECT_TIMEOUT_MS,
	);
	if (timedOut) {
		return {
			dialogs: [],
			inspectTimedOut: true,
			mainWindowTitle: null,
			responding: true,
		};
	}
	const parsed = parseInspectJson(stdout);
	return parsed;
}

/** Lightweight health without UIA (after repeated inspect timeouts). */
export async function inspectTdUiLight(
	pid: number,
): Promise<TdUiInspectResult> {
	if (process.platform !== "win32" || !Number.isFinite(pid) || pid <= 0) {
		return {
			dialogs: [],
			mainWindowTitle: null,
			responding: true,
		};
	}
	const script = `
$ErrorActionPreference = 'SilentlyContinue'
$proc = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
if (-not $proc) { Write-Output '{"responding":true,"mainWindowTitle":"","dialogs":[]}'; exit 0 }
@{ responding = [bool]$proc.Responding; mainWindowTitle = [string]$proc.MainWindowTitle; dialogs = @() } | ConvertTo-Json -Compress
`.trim();
	const { stdout, timedOut } = await runPowershellImpl(script, 1500);
	if (timedOut) {
		return {
			dialogs: [],
			inspectTimedOut: true,
			mainWindowTitle: null,
			responding: true,
		};
	}
	return parseInspectJson(stdout);
}

export async function dismissTdUiDialog(title: string): Promise<DismissResult> {
	const t = title.trim();
	if (isDismissBlockedTitle(t) || process.platform !== "win32") {
		return { dismissed: false, title: t };
	}
	const { stdout, timedOut } = await runPowershellImpl(
		dismissScript(t),
		DISMISS_TIMEOUT_MS,
	);
	if (timedOut) {
		return { dismissed: false, title: t };
	}
	try {
		const parsed = JSON.parse(stdout.trim()) as { dismissed?: boolean };
		return { dismissed: Boolean(parsed.dismissed), title: t };
	} catch {
		return { dismissed: false, title: t };
	}
}

export async function dismissAllTdUiDialogs(
	dialogs: TdUiDialog[],
): Promise<{ attempted: TdUiDialog[]; dismissed: TdUiDialog[] }> {
	const attempted: TdUiDialog[] = [];
	const dismissed: TdUiDialog[] = [];
	for (const d of dialogs) {
		if (isDismissBlockedTitle(d.title)) {
			continue;
		}
		attempted.push(d);
		const result = await dismissTdUiDialog(d.title);
		if (result.dismissed) {
			dismissed.push(d);
		}
	}
	return { attempted, dismissed };
}

---
name: td-launch
description: This skill should be used when the user runs /td-companion:td-launch or asks to "start TouchDesigner", "launch TD", "open TouchDesigner with the MCP component", "set up TouchDesigner from scratch", or says TouchDesigner isn't running yet — it launches the TouchDesigner application with mcp_webserver_base.tox imported and waits until the MCP connection is live. For diagnosing an already-running TouchDesigner, the td-setup skill applies instead.
argument-hint: "[tox-path]"
version: 0.1.0
---

# TD Launch

Launch TouchDesigner with the `mcp_webserver_base.tox` component loaded, then wait until the MCP bridge answers. The key mechanism: opening the `.tox` file *as a document* (instead of launching the bare app) makes TouchDesigner start a new project with the component already imported — no manual drag-and-drop. On macOS, `open -a TouchDesigner <tox>` routes the document to an already-running instance as well.

## Workflow

1. **Check whether launching is even needed.** Read the endpoint from the `td-companion configuration` context injected at session start, falling back to `http://127.0.0.1:9981` if that context is missing. Call `get_td_info`. If it succeeds, TouchDesigner is already up with the component loaded — report the versions and stop. This makes the command idempotent. If it fails and the configured host is not a loopback host, stop here: this command can launch only a local TouchDesigner application, so ask the user to start TouchDesigner on the configured remote machine and continue with `/td-companion:td-setup` instead.

2. **Resolve the `.tox` file, in this order:**
   a. The `tox-path` argument, if given. Verify the file exists before using it.
   b. An existing copy on disk: check common locations (`~/Downloads`, `~/Documents`, the current project directory) for `mcp_webserver_base.tox` with a quick `find`/`ls`.
   c. **Download it**: fetch `https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip` with `curl -L` into a persistent location (e.g. `~/Documents/touchdesigner-mcp/`), unzip it there, and use the `mcp_webserver_base.tox` inside. Keep the tox where it was unzipped — it may resolve bundled resources relative to its own path, so don't move the single file out of the extracted folder.

3. **Locate the TouchDesigner application.**
   - macOS: `/Applications/TouchDesigner.app` (glob `/Applications/TouchDesigner*` — versioned installs exist).
   - Windows: run PowerShell explicitly from Claude Code's Bash environment and capture the newest matching executable:
     ```bash
     powershell.exe -NoProfile -Command 'Get-ChildItem -Path "$env:ProgramFiles\Derivative" -Filter TouchDesigner.exe -Recurse -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName'
     ```
   If not found, ask where TouchDesigner is installed rather than guessing further.

4. **Launch with the tox as the opened document** (a Bash permission prompt is expected here — this skill deliberately does not pre-authorize shell commands):
   - macOS: `open -a TouchDesigner "<abs-path-to-tox>"`
   - Windows: invoke PowerShell explicitly; Bash cannot run the `start` cmd.exe built-in directly:
     ```bash
     powershell.exe -NoProfile -Command 'Start-Process -FilePath $args[0] -ArgumentList $args[1]' "<TouchDesigner.exe>" "<abs-path-to-tox>"
     ```
   If TouchDesigner is already running without the component, the same command loads the tox into the running instance on macOS; on Windows, ask the user to drag the tox into the project instead of spawning a second instance.

5. **Poll until the bridge is live.** TouchDesigner startup takes tens of seconds (longer on first run). Poll the endpoint reported in the session-start configuration context every ~5 seconds for up to 3 minutes (run the loop in the background rather than blocking). While waiting, tell the user that a license dialog or crash-recovery prompt on the TouchDesigner side blocks startup and must be dismissed manually.

6. **Confirm end to end.** Once the port answers, call `get_td_info` and report the TouchDesigner/server versions. Note the resulting project layout: a project opened this way has no `/project1` — the component sits at the root as `/mcp_webserver_base`, and new work happens at `/` or inside a container COMP created there. If the port answers but `get_td_info` still fails, hand off to the `/td-companion:td-setup` diagnostic ladder instead of retrying blindly.

## Failure handling

If the download in step 2c fails, give the release URL and ask the user to download and unzip it manually, then re-run with the path as the argument. If the configured endpoint never answers within the timeout: the most common causes are a modal dialog in TouchDesigner (license, update, crash recovery — ask the user to look at the TD window), a mismatch between the plugin configuration and the WebServer DAT (hand off to `/td-companion:td-setup`), or the tox failing to initialize (ask the user to check TouchDesigner's Textport for Python errors and report them back). Never kill or restart a running TouchDesigner process without explicit user consent — unsaved work may be open.

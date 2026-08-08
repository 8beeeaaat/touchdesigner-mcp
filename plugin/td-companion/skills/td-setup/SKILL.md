---
name: td-setup
description: This skill should be used when the user runs /td-companion:td-setup or asks to verify, check, fix, or set up the TouchDesigner connection — trigger phrases include "check my TD connection", "is TouchDesigner connected", "set up touchdesigner-mcp", "TD isn't responding", "fix the TouchDesigner connection", or "verify TouchDesigner is reachable". If TouchDesigner is not running at all and needs to be started, the td-launch skill applies instead.
version: 0.1.0
---

# TD Setup

Verify that the bundled touchdesigner-mcp server can reach a running TouchDesigner instance, and walk through a fix when it cannot.

## Workflow

1. Read the TouchDesigner host, port, and endpoint from the `td-companion configuration` context injected at session start. `get_td_info` takes no connection parameters because the bundled MCP server receives the same values through its startup arguments. If the configuration context is missing, use `http://127.0.0.1:9981` as the fallback and tell the user the plugin's SessionStart hook may be disabled.

2. Call `get_td_info` with no parameters.

3. If it succeeds, the response carries TouchDesigner's build metadata (server name, version, operating system). Report these values back to the user in plain language (e.g. "Connected to TouchDesigner <version> on <os>") and confirm the connection is ready. Optionally call `describe_td_tools` (e.g. with `detailLevel: "summary"`) to summarize the available tool categories so the user sees what's usable from here. Stop here — no further diagnostics are needed.

4. If `get_td_info` fails, walk the following diagnostic ladder one step at a time, asking the user to confirm each fix before moving to the next, and re-calling `get_td_info` after every confirmed fix:
   a. **Is TouchDesigner running?** Ask the user to confirm the TouchDesigner application is open with a project loaded. If not, ask them to launch it and load their project, then retry.
   b. **Is `mcp_webserver_base.tox` imported?** The project must have this component dragged into `/project1`. It ships in the `td/` directory of the touchdesigner-mcp GitHub repository (also attached to GitHub releases). If the user hasn't imported it — or TouchDesigner isn't running at all — offer `/td-companion:td-launch`, which automates downloading the tox, launching TouchDesigner with it imported, and waiting for the connection; otherwise point them to the repo/release and ask them to drag it in, then retry.
   c. **Is the WebServer DAT active on the configured port?** Inside the imported component, the WebServer DAT must be running and bound to the port reported in the session-start configuration context. Ask the user to check the DAT's Active parameter and port, then retry.
   d. **Does the configured endpoint match TouchDesigner?** Compare the WebServer DAT with the host and port reported in the configuration context. If they differ, tell the user to update the plugin's `touchdesigner_host` / `touchdesigner_port` configuration, then run `/reload-plugins` or start a new session before retrying. Do not add a project-scoped MCP server as an override: it gets a different tool namespace and will not replace the bundled server authorized by this skill.

5. Once `get_td_info` succeeds after a fix, proceed as in step 3. If every step in the ladder has been confirmed and it still fails, report that clearly rather than guessing further — see Failure handling.

## Failure handling

If `get_td_info` still fails after the full diagnostic ladder, report the exact error text returned by the tool, state which ladder steps were confirmed by the user, and stop rather than speculating about further causes — TouchDesigner-side network or firewall issues are outside what this skill can diagnose remotely. If `describe_td_tools` fails while `get_td_info` succeeded, report that the connection itself is healthy but the tool manifest could not be generated, and include the raw error. Never claim the connection is verified based on anything other than a successful `get_td_info` call.

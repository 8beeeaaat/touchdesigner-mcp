import { readFileSync } from "node:fs";

// Read the defaults from plugin.json rather than repeating them here.
// Observed on Claude Code 2.1.278 (the plugin docs do not spell this out):
// userConfig defaults are substituted into the bundled server's
// `${user_config.*}` arguments, but CLAUDE_PLUGIN_OPTION_* carries only values
// the user stored. Without this an unconfigured plugin would have two
// independent sources of truth for the same endpoint.
let userConfig;
try {
	({ userConfig } = JSON.parse(
		readFileSync(
			new URL("../../.claude-plugin/plugin.json", import.meta.url),
			"utf-8",
		),
	));
} catch (error) {
	process.stderr.write(
		`td-config-context: could not read the plugin manifest next to this hook: ${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exit(1);
}

const storedHost = process.env.CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_HOST;
const storedPort = process.env.CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_PORT;

// `||`, not `??`: a field the user cleared arrives as an empty string. Fall
// back to the default for the announcement, but say so below — whether the
// server itself received the default or `--host=` is not documented.
const host = storedHost || userConfig.touchdesigner_host.default;
const port = storedPort || userConfig.touchdesigner_port.default;

// touchdesigner-mcp-server builds its base URL as `${host}:${port}`, so the
// host must stop at the hostname. Anything else starts cleanly and fails on
// the first tool call with a bare "Invalid URL"; warn here instead.
const warnings = [];
if (storedHost === "") {
	warnings.push(
		"touchdesigner_host is stored as an empty string. The bundled server may have received an empty --host and will then reject every call; clear the option back to its default or set a URL, then run /reload-plugins.",
	);
}
if (storedPort === "") {
	warnings.push(
		"touchdesigner_port is stored as an empty string; the bundled server may have received an empty --port. Clear the option back to its default or set a port, then run /reload-plugins.",
	);
}
let hostShape = "invalid";
try {
	const url = new URL(host);
	if (
		["http:", "https:"].includes(url.protocol) &&
		!url.username &&
		!url.password &&
		/^https?:\/\/(?:\[[^\]]+\]|[^:/?#\\]+)$/i.test(host)
	) {
		hostShape = "ok";
	}
} catch {
	hostShape = "invalid";
}
if (hostShape !== "ok") {
	warnings.push(
		`touchdesigner_host is "${host}" but must be the scheme and hostname only, e.g. http://127.0.0.1 — no port, path, query, or trailing slash. The server appends :${port} itself, so this value produces an invalid URL and every tool call will fail. Put the port in touchdesigner_port, fix the option, then run /reload-plugins.`,
	);
}
if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) {
	warnings.push(
		`touchdesigner_port is "${port}" but must be an integer from 1 to 65535.`,
	);
}

const summary = `TouchDesigner MCP endpoint: host is ${host}; port is ${port}; endpoint is ${host}:${port}. Use these values for the setup and launch diagnostics.`;
const additionalContext = warnings.length
	? `${summary}\n\nConfiguration warnings — surface these to the user before running any TouchDesigner tool:\n${warnings.map((line) => `- ${line}`).join("\n")}`
	: summary;

process.stdout.write(
	JSON.stringify({
		hookSpecificOutput: {
			additionalContext,
			hookEventName: "SessionStart",
		},
	}),
);

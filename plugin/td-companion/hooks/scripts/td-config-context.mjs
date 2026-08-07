import { readFileSync } from "node:fs";

// Read the defaults from plugin.json rather than repeating them here: Claude
// Code applies userConfig defaults to the bundled MCP server, but passes only
// stored values through CLAUDE_PLUGIN_OPTION_*, so an unconfigured plugin would
// otherwise have two independent sources of truth for the same endpoint.
const { userConfig } = JSON.parse(
	readFileSync(
		new URL("../../.claude-plugin/plugin.json", import.meta.url),
		"utf-8",
	),
);

// `||`, not `??`: Claude Code treats an empty option as unset, so a cleared
// field must fall back instead of being announced as the configured endpoint.
const host =
	process.env.CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_HOST ||
	userConfig.touchdesigner_host.default;
const port =
	process.env.CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_PORT ||
	userConfig.touchdesigner_port.default;

process.stdout.write(
	JSON.stringify({
		hookSpecificOutput: {
			additionalContext: `td-companion configuration: TouchDesigner host is ${host}; port is ${port}; endpoint is ${host}:${port}. Use these values for td-setup and td-launch diagnostics.`,
			hookEventName: "SessionStart",
		},
	}),
);

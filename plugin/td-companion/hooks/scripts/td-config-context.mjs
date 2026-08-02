const defaultHost = "http://127.0.0.1";
const defaultPort = "9981";

const host = (
	process.env.CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_HOST ?? defaultHost
).replace(/[\r\n]/g, "");
const port = (
	process.env.CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_PORT ?? defaultPort
).replace(/[\r\n]/g, "");

process.stdout.write(
	JSON.stringify({
		hookSpecificOutput: {
			additionalContext: `td-companion configuration: TouchDesigner host is ${host}; port is ${port}; endpoint is ${host}:${port}. Use these values for td-setup and td-launch diagnostics.`,
			hookEventName: "SessionStart",
		},
	}),
);

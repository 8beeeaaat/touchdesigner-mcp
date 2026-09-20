import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

// The two hook scripts are the only code in the plugin that runs on the
// user's machine, and the other plugin suites only regex-scan their source.
// Run them for real: a broken relative path to plugin.json, malformed JSON,
// or a lost fallback would otherwise fail every session start in silence.

const exec = promisify(execFile);
const PLUGIN_DIR = fileURLToPath(
	new URL("../../plugin/touchdesigner/", import.meta.url),
);
const HOST = "CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_HOST";
const PORT = "CLAUDE_PLUGIN_OPTION_TOUCHDESIGNER_PORT";

type Options = { host?: string; port?: string };

async function sessionStart(options: Options = {}) {
	const env: NodeJS.ProcessEnv = { ...process.env };
	delete env[HOST];
	delete env[PORT];
	if (options.host !== undefined) env[HOST] = options.host;
	if (options.port !== undefined) env[PORT] = options.port;
	const { stdout } = await exec(
		process.execPath,
		[`${PLUGIN_DIR}hooks/scripts/td-config-context.mjs`],
		{ env },
	);
	const parsed = JSON.parse(stdout) as {
		hookSpecificOutput: { additionalContext: string; hookEventName: string };
	};
	expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
	return parsed.hookSpecificOutput.additionalContext;
}

describe("td-config-context SessionStart hook", () => {
	it("announces the plugin.json defaults when nothing is stored", async () => {
		const context = await sessionStart();
		expect(context).toContain("endpoint is http://127.0.0.1:9981");
		expect(context).not.toContain("Configuration warnings");
	});

	it("announces stored values verbatim", async () => {
		const context = await sessionStart({
			host: "https://td.example",
			port: "9982",
		});
		expect(context).toContain("endpoint is https://td.example:9982");
		expect(context).not.toContain("Configuration warnings");
	});

	it.each([
		["http://127.0.0.1:9981", "no port, path, query, or trailing slash"],
		["http://127.0.0.1/", "no port, path, query, or trailing slash"],
		["localhost", "no port, path, query, or trailing slash"],
	])("warns instead of endorsing host %s", async (host, expected) => {
		const context = await sessionStart({ host });
		expect(context).toContain("Configuration warnings");
		expect(context).toContain(expected);
		expect(context).toContain(`touchdesigner_host is "${host}"`);
	});

	it("falls back to the default for a cleared field but says so", async () => {
		const context = await sessionStart({ host: "", port: "" });
		expect(context).toContain("endpoint is http://127.0.0.1:9981");
		expect(context).toContain(
			"touchdesigner_host is stored as an empty string",
		);
		expect(context).toContain(
			"touchdesigner_port is stored as an empty string",
		);
	});

	it("warns about a port outside 1-65535", async () => {
		const context = await sessionStart({ port: "70000" });
		expect(context).toContain('touchdesigner_port is "70000"');
	});
});

describe("td-verify-reminder PostToolUse hook", () => {
	it("emits a PostToolUse reminder as valid JSON regardless of stdin", async () => {
		const script = `${PLUGIN_DIR}hooks/scripts/td-verify-reminder.sh`;
		const withInput = exec("bash", [script]);
		withInput.child.stdin?.end(
			JSON.stringify({ tool_name: "create_td_node", tool_response: {} }),
		);
		const closedInput = exec("bash", [script]);
		closedInput.child.stdin?.end();
		for (const run of [withInput, closedInput]) {
			const { stdout } = await run;
			const parsed = JSON.parse(stdout) as {
				hookSpecificOutput: {
					additionalContext: string;
					hookEventName: string;
				};
			};
			expect(parsed.hookSpecificOutput.hookEventName).toBe("PostToolUse");
			expect(parsed.hookSpecificOutput.additionalContext).toContain(
				"get_td_node_errors",
			);
		}
	});
});

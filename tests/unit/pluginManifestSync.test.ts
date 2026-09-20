import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The touchdesigner plugin wires its TouchDesigner endpoint through Claude Code's
// `userConfig` mechanism: the Claude Code binary substitutes `${user_config.<key>}`
// in .mcp.json, and skips the MCP server entirely when a *required* option has
// no value (observed on Claude Code 2.1.278 as "has missing required
// configuration, skipping MCP config"). Nothing fails loudly when these files
// drift — an unresolved placeholder reaches the server verbatim, and a renamed
// option silently reverts the endpoint to a default while the SessionStart hook
// still announces it as configured truth. This suite pins the files that have
// to agree.

const PLUGIN_DIR = "plugin/touchdesigner";

async function readRepoFile(relativePath: string): Promise<string> {
	return fs.readFile(
		fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
		"utf-8",
	);
}

type UserConfigOption = {
	default?: unknown;
	required?: boolean;
	type: string;
};

async function readPluginManifest(): Promise<{
	description: string;
	name: string;
	userConfig: Record<string, UserConfigOption>;
	version: string;
}> {
	return JSON.parse(
		await readRepoFile(`${PLUGIN_DIR}/.claude-plugin/plugin.json`),
	);
}

describe("touchdesigner userConfig wiring", () => {
	it("declares every option that .mcp.json interpolates", async () => {
		const { userConfig } = await readPluginManifest();
		const mcpConfig = await readRepoFile(`${PLUGIN_DIR}/.mcp.json`);

		const referenced = [
			...new Set(
				[...mcpConfig.matchAll(/\$\{user_config\.([^}]+)\}/g)].map(
					(match) => match[1],
				),
			),
		];

		expect(referenced.length).toBeGreaterThan(0);
		expect(
			referenced.filter((key) => !(key in userConfig)),
			"an undeclared key reaches the server as an uninterpolated placeholder string",
		).toEqual([]);
	});

	it("keeps every option optional with a default", async () => {
		const { userConfig } = await readPluginManifest();
		const options = Object.entries(userConfig);
		expect(options.length).toBeGreaterThan(0);

		// A `required` option the user never sets makes Claude Code drop the whole
		// MCP server, so the plugin would ship with no TouchDesigner tools at all.
		for (const [key, option] of options) {
			expect(option.required ?? false, `${key} must not be required`).toBe(
				false,
			);
			expect(option.default, `${key} must declare a default`).toBeDefined();
		}
	});

	it("reads only declared options in the SessionStart hook", async () => {
		const { userConfig } = await readPluginManifest();
		const hook = await readRepoFile(
			`${PLUGIN_DIR}/hooks/scripts/td-config-context.mjs`,
		);

		const read = [
			...new Set(
				[...hook.matchAll(/CLAUDE_PLUGIN_OPTION_([A-Z0-9_]+)/g)].map(
					(match) => match[1],
				),
			),
		];
		const declared = Object.keys(userConfig).map((key) => key.toUpperCase());

		expect(read.length).toBeGreaterThan(0);
		expect(read.filter((key) => !declared.includes(key))).toEqual([]);
	});

	// The PostToolUse matcher used to accept any server's `mcp__…__` namespace,
	// so another MCP server exposing a tool called `execute_python_script`
	// collected a TouchDesigner verification reminder it had nothing to do with.
	// Binding it to the bundled server's namespace fixes that but trades a
	// visible false positive for an invisible false negative: if the namespace
	// ever changes shape, the hook simply stops firing and nothing says so.
	// `allowed-tools` names the same namespace, and a wrong entry there at least
	// shows up as unexpected permission prompts, so pin the two together and let
	// this test fail instead of the hook going quiet.
	it("matches the same server namespace the skills name in allowed-tools", async () => {
		const hooks = JSON.parse(
			await readRepoFile(`${PLUGIN_DIR}/hooks/hooks.json`),
		);
		const overview = await readRepoFile(
			`${PLUGIN_DIR}/skills/overview/SKILL.md`,
		);

		const matcher: string = hooks.hooks.PostToolUse[0].matcher;
		const hookNamespace = matcher.match(/mcp__[A-Za-z0-9_-]+__/)?.[0];
		const skillNamespaces = [
			...new Set(
				[...overview.matchAll(/mcp__[A-Za-z0-9_-]+__/g)].map((m) => m[0]),
			),
		];

		expect(skillNamespaces).toHaveLength(1);
		expect(hookNamespace).toBe(skillNamespaces[0]);
		// A wildcard namespace would match another server's tools.
		expect(matcher.startsWith("^mcp__")).toBe(true);
	});
});

describe("marketplace entry", () => {
	it("agrees with the plugin manifest it points at", async () => {
		const manifest = await readPluginManifest();
		const marketplace = JSON.parse(
			await readRepoFile(".claude-plugin/marketplace.json"),
		) as {
			plugins: Array<{
				description?: string;
				name: string;
				source: string;
				version?: string;
			}>;
		};

		const entry = marketplace.plugins.find(
			(plugin) => plugin.name === manifest.name,
		);
		if (!entry) {
			throw new Error(`no marketplace entry named "${manifest.name}"`);
		}

		// Sources resolve relative to the marketplace root, not to marketplace.json
		// — a wrong path yields "No manifest found in directory" at load time.
		expect(entry.source).toBe(`./${PLUGIN_DIR}`);
		await expect(
			readRepoFile(`${PLUGIN_DIR}/.claude-plugin/plugin.json`),
		).resolves.toBeTruthy();

		// Nothing validates the copied description, so it drifts in silence.
		expect(entry.description).toBe(manifest.description);

		// `version` is optional in a marketplace entry. When both it and plugin.json
		// name one, Claude Code uses the plugin.json value, so a stale marketplace
		// version would silently mask a bump; assert agreement whenever one is set.
		if (entry.version !== undefined) {
			expect(entry.version).toBe(manifest.version);
		}
	});
});

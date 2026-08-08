import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The td-companion plugin wires its TouchDesigner endpoint through Claude Code's
// `userConfig` mechanism, which is real but undocumented: the Claude Code binary
// substitutes `${user_config.<key>}` in .mcp.json, and skips the MCP server
// entirely when a *required* option has no value ("has missing required
// configuration, skipping MCP config"). Nothing fails loudly when these files
// drift — an unresolved placeholder reaches the server verbatim, and a renamed
// option silently reverts the endpoint to a default while the SessionStart hook
// still announces it as configured truth. This suite pins the files that have
// to agree.

const PLUGIN_DIR = "plugin/td-companion";

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

describe("td-companion userConfig wiring", () => {
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

		// `version` is optional here (270 of the 284 entries in the official
		// marketplace omit it) and Claude Code cross-checks it against plugin.json
		// when present, so only assert the agreement it would report.
		if (entry.version !== undefined) {
			expect(entry.version).toBe(manifest.version);
		}
	});
});

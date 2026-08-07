import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../../src/core/constants.js";
import { TOOL_DEFINITIONS } from "../../src/features/tools/toolDefinitions.js";

// The server registers tools from TOOL_NAMES, but several listings restate
// those names by hand: the README tool tables, the MCPB manifest, the
// td-companion plugin's PostToolUse hook matcher, and its skills'
// allowed-tools frontmatter. Each can drift from the implementation
// independently. This suite fails whenever a tool is added, renamed, or
// removed without updating every listing that names it.

const REGISTERED_TOOL_NAMES = Object.values(TOOL_NAMES).sort();
const PLUGIN_DIR = "plugin/td-companion";

function extractToolTableNames(markdown: string): string[] {
	const heading = markdown.match(/^### (?:Tools|ツール).*$/m);
	if (heading?.index === undefined) {
		throw new Error("tools section heading not found");
	}
	const rest = markdown.slice(heading.index + heading[0].length);
	const nextHeading = rest.search(/^### /m);
	const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
	return [...section.matchAll(/^\|\s*`([a-z0-9_]+)`\s*\|/gm)]
		.map((match) => match[1])
		.sort();
}

async function readRepoFile(relativePath: string): Promise<string> {
	return fs.readFile(
		fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
		"utf-8",
	);
}

describe("README tool tables", () => {
	it("lists every registered tool in README.md", async () => {
		expect(extractToolTableNames(await readRepoFile("README.md"))).toEqual(
			REGISTERED_TOOL_NAMES,
		);
	});

	it("lists every registered tool in README.ja.md", async () => {
		expect(extractToolTableNames(await readRepoFile("README.ja.md"))).toEqual(
			REGISTERED_TOOL_NAMES,
		);
	});

	it("lists every registered tool in mcpb/manifest.json", async () => {
		const manifest = JSON.parse(await readRepoFile("mcpb/manifest.json")) as {
			tools: Array<{ name: string }>;
		};
		expect(manifest.tools.map((tool) => tool.name).sort()).toEqual(
			REGISTERED_TOOL_NAMES,
		);
	});

	it("names only real tools in the td-companion PostToolUse hook matcher", async () => {
		const hooks = JSON.parse(
			await readRepoFile(`${PLUGIN_DIR}/hooks/hooks.json`),
		) as { hooks: { PostToolUse: Array<{ matcher: string }> } };
		const alternation = hooks.hooks.PostToolUse[0].matcher.match(/\(([^)]+)\)/);
		if (!alternation) {
			throw new Error(
				"no tool-name alternation group in the PostToolUse matcher",
			);
		}
		const matched = alternation[1].split("|");
		expect(matched.length).toBeGreaterThan(0);
		expect(
			matched.filter((name) => !REGISTERED_TOOL_NAMES.includes(name)),
		).toEqual([]);
	});

	it("names only real tools in every td-companion skill's allowed-tools", async () => {
		const { name: pluginName } = JSON.parse(
			await readRepoFile(`${PLUGIN_DIR}/.claude-plugin/plugin.json`),
		) as { name: string };
		const serverKeys = Object.keys(
			JSON.parse(await readRepoFile(`${PLUGIN_DIR}/.mcp.json`)),
		);
		expect(serverKeys).toHaveLength(1);
		const prefix = `mcp__plugin_${pluginName}_${serverKeys[0]}__`;

		const skillsDir = fileURLToPath(
			new URL(`../../${PLUGIN_DIR}/skills`, import.meta.url),
		);
		const skills = await fs.readdir(skillsDir);
		expect(skills.length).toBeGreaterThan(0);

		const declared: string[] = [];
		for (const skill of skills) {
			const source = await readRepoFile(
				`${PLUGIN_DIR}/skills/${skill}/SKILL.md`,
			);
			const line = source.match(/^allowed-tools:.*$/m);
			if (!line) {
				continue;
			}
			// Every entry must carry the bundled server's prefix; a bare or
			// differently-prefixed name would silently match no tool at runtime.
			for (const entry of line[0].matchAll(/"([^"]+)"/g)) {
				expect(entry[1].startsWith(prefix)).toBe(true);
				declared.push(entry[1].slice(prefix.length));
			}
		}
		expect(declared.length).toBeGreaterThan(0);
		expect(
			[...new Set(declared)].filter(
				(name) => !REGISTERED_TOOL_NAMES.includes(name),
			),
		).toEqual([]);
	});

	it("keeps TOOL_NAMES in sync with the tools the server registers", () => {
		const registered = [
			...TOOL_DEFINITIONS.map((definition) => definition.name),
			TOOL_NAMES.DESCRIBE_TD_TOOLS,
		].sort();
		expect(registered).toEqual(REGISTERED_TOOL_NAMES);
	});
});

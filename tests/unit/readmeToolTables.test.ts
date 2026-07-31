import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../../src/core/constants.js";
import { TOOL_DEFINITIONS } from "../../src/features/tools/toolDefinitions.js";

// The README tool tables are hand-written while the server registers tools from
// TOOL_NAMES, so the tables are the only place that can drift from the
// implementation. This suite fails whenever a tool is added, renamed, or
// removed without updating both READMEs.

const REGISTERED_TOOL_NAMES = Object.values(TOOL_NAMES).sort();

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

	it("keeps TOOL_NAMES in sync with the tools the server registers", () => {
		const registered = [
			...TOOL_DEFINITIONS.map((definition) => definition.name),
			TOOL_NAMES.DESCRIBE_TD_TOOLS,
		].sort();
		expect(registered).toEqual(REGISTERED_TOOL_NAMES);
	});
});

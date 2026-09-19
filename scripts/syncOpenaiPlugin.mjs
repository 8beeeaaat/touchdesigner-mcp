import { cp, mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildOpenaiPlugin } from "./buildOpenaiPlugin.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const { values } = parseArgs({ options: { check: { type: "boolean" } } });
const temporary = await mkdtemp(join(tmpdir(), "td-openai-distribution-"));
const targets = ["plugins/touchdesigner", ".agents/plugins/marketplace.json"];

async function files(root, relative = "") {
	const result = [];
	for (const entry of await readdir(join(root, relative), {
		withFileTypes: true,
	})) {
		const name = join(relative, entry.name);
		if (entry.isDirectory()) result.push(...(await files(root, name)));
		else if (entry.isFile()) result.push(name);
		else throw new Error(`Unexpected non-file in distribution: ${name}`);
	}
	return result.sort();
}

try {
	await buildOpenaiPlugin({ out: temporary });
	if (values.check) {
		const plugin = targets[0];
		const expected = await files(join(temporary, plugin));
		const actual = await files(join(repo, plugin));
		if (JSON.stringify(expected) !== JSON.stringify(actual)) {
			throw new Error(
				"OpenAI distribution file list differs; run npm run plugin:sync",
			);
		}
		for (const relative of [
			targets[1],
			...expected.map((name) => join(plugin, name)),
		]) {
			const generated = await readFile(join(temporary, relative));
			const committed = await readFile(join(repo, relative));
			if (!generated.equals(committed)) {
				throw new Error(
					`OpenAI distribution is stale: ${relative}; run npm run plugin:sync`,
				);
			}
		}
		console.log("OpenAI marketplace and bundled plugin are up to date.");
	} else {
		// Replace only this plugin's generated tree; preserve other plugins.
		await rm(join(repo, targets[0]), { force: true, recursive: true });
		for (const relative of targets) {
			await mkdir(dirname(join(repo, relative)), { recursive: true });
			await cp(join(temporary, relative), join(repo, relative), {
				recursive: true,
			});
		}
		console.log("Updated the repository's OpenAI marketplace distribution.");
	}
} finally {
	await rm(temporary, { force: true, recursive: true });
}

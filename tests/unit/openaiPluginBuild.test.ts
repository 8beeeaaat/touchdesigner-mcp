import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

const exec = promisify(execFile);
const repo = fileURLToPath(new URL("../../", import.meta.url));
const temporary: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporary
			.splice(0)
			.map((dir) => fs.rm(dir, { force: true, recursive: true })),
	);
});

async function directory() {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "td-openai-plugin-"));
	temporary.push(dir);
	return dir;
}

async function build(out: string, ...args: string[]) {
	return exec(process.execPath, [
		path.join(repo, "scripts/buildOpenaiPlugin.mjs"),
		`--out=${out}`,
		...args,
	]);
}

async function json(file: string) {
	return JSON.parse(await fs.readFile(file, "utf8"));
}

describe("OpenAI plugin packaging", () => {
	it.each([
		["http://127.0.0.1/", "http://127.0.0.1"],
		["https://TD.EXAMPLE/", "https://td.example"],
		["http://[::1]/", "http://[::1]"],
	])(
		"normalizes host %s before the server appends its port",
		async (host, expected) => {
			const out = await directory();
			await build(out, `--host=${host}`, "--port=9982");
			const config = await json(
				path.join(out, "plugins/touchdesigner/.mcp.json"),
			);
			const args: string[] = config.mcpServers.touchdesigner.args;
			const generatedHost = args
				.find((arg) => arg.startsWith("--host="))
				?.slice(7);
			const generatedPort = args
				.find((arg) => arg.startsWith("--port="))
				?.slice(7);
			expect(generatedHost).toBe(expected);
			expect(new URL(`${generatedHost}:${generatedPort}`).origin).toBe(
				`${expected}:9982`,
			);
		},
	);

	it.each([
		"http://127.0.0.1:9981",
		"http://127.0.0.1:80/",
		"https://td.example:443",
		"http://[::1]:9981/",
		"http://127.0.0.1/api",
		"http://127.0.0.1/?mode=test",
		"http://127.0.0.1/#endpoint",
		"http://127.0.0.1\\api",
	])("rejects unusable host %s before writing output", async (host) => {
		const out = await directory();
		await expect(build(out, `--host=${host}`)).rejects.toThrow(
			"use --port separately",
		);
		expect(await fs.readdir(out)).toEqual([]);
	});

	it.each(["127.0.0.1", "localhost"])(
		"rejects scheme-less host %s with the project's own message",
		async (host) => {
			const out = await directory();
			await expect(build(out, `--host=${host}`)).rejects.toThrow(
				"host must be an HTTP(S) URL",
			);
			expect(await fs.readdir(out)).toEqual([]);
		},
	);

	it("ships all shared skills and references with executable MCP arguments", async () => {
		const out = await directory();
		await build(out, "--port=9982");
		const plugin = path.join(out, "plugins/touchdesigner");
		const manifest = await json(path.join(plugin, ".codex-plugin/plugin.json"));
		const claude = await json(
			path.join(repo, "plugin/touchdesigner/.claude-plugin/plugin.json"),
		);
		expect(manifest.version).toBe(claude.version);
		expect(manifest.userConfig).toBeUndefined();
		const mcp = await json(path.join(plugin, manifest.mcpServers));
		expect(mcp.mcpServers.touchdesigner.command).toBe("npx");
		expect(mcp.mcpServers.touchdesigner.args).toContain("--port=9982");
		expect(JSON.stringify(mcp)).not.toContain("${");
		// The Claude config pins npx's prefix to ${CLAUDE_PLUGIN_ROOT}; Codex
		// expands no such variable, so the flag is dropped rather than shipped.
		expect(
			mcp.mcpServers.touchdesigner.args.filter((arg: string) =>
				arg.startsWith("--prefix="),
			),
		).toEqual([]);
		const catalog = await json(
			path.join(out, ".agents/plugins/marketplace.json"),
		);
		expect(path.resolve(out, catalog.plugins[0].source.path)).toBe(plugin);
		const skills = await fs.readdir(
			path.join(repo, "plugin/touchdesigner/skills"),
		);
		expect((await fs.readdir(path.join(plugin, "skills"))).sort()).toEqual(
			[...skills].sort(),
		);
		for (const skill of skills) {
			const text = await fs.readFile(
				path.join(plugin, "skills", skill, "SKILL.md"),
				"utf8",
			);
			const frontmatter = parse(
				text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "",
			);
			expect(Object.keys(frontmatter).sort()).toEqual(["description", "name"]);
			expect(text).not.toContain("mcp__plugin_");
			expect(text).toContain("After any network mutation");
		}
		const reference = "skills/fundamentals/references/operator-guide.md";
		expect(await fs.readFile(path.join(plugin, reference), "utf8")).toBe(
			await fs.readFile(
				path.join(repo, "plugin/touchdesigner", reference),
				"utf8",
			),
		);
		expect(await fs.readdir(plugin)).not.toContain("hooks");
	});

	it("switches between registered ChatGPT and local MCP without stale connections", async () => {
		const out = await directory();
		const plugin = path.join(out, "plugins/touchdesigner");
		await build(out);
		await build(out, "--app-id=plugin_asdk_app_test");
		const manifest = await json(path.join(plugin, ".codex-plugin/plugin.json"));
		expect(manifest.mcpServers).toBeUndefined();
		expect(
			(await json(path.join(plugin, manifest.apps))).apps.touchdesigner.id,
		).toBe("plugin_asdk_app_test");
		expect(await fs.readdir(plugin)).not.toContain(".mcp.json");
		await build(out);
		expect(await fs.readdir(plugin)).not.toContain(".app.json");
	});

	it("rejects invalid options and refuses to replace unrelated output", async () => {
		const out = await directory();
		await expect(build(out, "--port=0")).rejects.toThrow("port must");
		await expect(build(out, "--app-id=invalid")).rejects.toThrow("app-id must");
		await fs.writeFile(path.join(out, "keep.txt"), "keep");
		await expect(build(out)).rejects.toThrow("output directory");
		expect(await fs.readFile(path.join(out, "keep.txt"), "utf8")).toBe("keep");
	});
});

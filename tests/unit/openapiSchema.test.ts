import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import yaml from "yaml";

// The schema is written in OpenAPI 3.1, where nullability is spelled in JSON
// Schema: `type: [X, "null"]` for a scalar, `anyOf: [$ref, { type: "null" }]`
// for a reference. 3.1 dropped the 3.0 `nullable` keyword, so a `nullable: true`
// added out of habit still bundles without complaint, yet a spec-strict reader
// of the published schema ignores it and rejects the `data: null` these
// endpoints return on failure. That is the state #233 fixed, so it is pinned
// here rather than left to review.

const API_DIR = fileURLToPath(new URL("../../src/api", import.meta.url));

async function loadSchemaFiles(): Promise<Map<string, unknown>> {
	const entries = await fs.readdir(API_DIR, { recursive: true });
	const files = new Map<string, unknown>();
	for (const entry of entries.filter((name) => /\.ya?ml$/.test(name)).sort()) {
		const source = await fs.readFile(path.join(API_DIR, entry), "utf-8");
		files.set(entry.split(path.sep).join("/"), yaml.parse(source));
	}
	return files;
}

// Yields the JSON-pointer-ish location of every `nullable` key in a document.
function* findNullable(node: unknown, at: string): Generator<string> {
	if (Array.isArray(node)) {
		for (const [index, item] of node.entries()) {
			yield* findNullable(item, `${at}/${index}`);
		}
		return;
	}
	if (node === null || typeof node !== "object") {
		return;
	}
	for (const [key, value] of Object.entries(node)) {
		if (key === "nullable") {
			yield at;
		}
		yield* findNullable(value, `${at}/${key}`);
	}
}

describe("OpenAPI schema (src/api)", () => {
	it("declares OpenAPI 3.1", async () => {
		const files = await loadSchemaFiles();
		const index = files.get("index.yml") as { openapi?: unknown };

		expect(index.openapi).toMatch(/^3\.1\.\d+$/);
	});

	it("spells nullability in JSON Schema, never with the 3.0 `nullable` keyword", async () => {
		const files = await loadSchemaFiles();
		const offenders = [...files].flatMap(([file, document]) =>
			[...findNullable(document, "")].map((pointer) => `${file}#${pointer}`),
		);

		expect(offenders).toEqual([]);
	});
});

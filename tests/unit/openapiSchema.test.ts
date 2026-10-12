import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Ajv2020 } from "ajv/dist/2020.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import yaml from "yaml";

const exec = promisify(execFile);

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

// The keyword check above only catches a `nullable` someone wrote. A field that
// was never marked nullable at all passes it, yet still rejects the envelope
// `error_result()` in td/modules/utils/result.py sends on every failure. So
// validate that envelope against each operation's response schema in the
// bundle that is actually published.

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const FAILURE_ENVELOPE = { data: null, error: "boom", success: false };

describe("OpenAPI schema (bundled)", () => {
	let bundle: { paths: Record<string, Record<string, unknown>> };
	let tmp: string;

	beforeAll(async () => {
		tmp = await fs.mkdtemp(path.join(os.tmpdir(), "td-openapi-bundle-"));
		const out = path.join(tmp, "openapi.yaml");
		await exec(process.execPath, [
			path.join(REPO, "node_modules/@redocly/cli/bin/cli.js"),
			"bundle",
			path.join(API_DIR, "index.yml"),
			"-o",
			out,
		]);
		bundle = yaml.parse(await fs.readFile(out, "utf-8"));
	}, 60_000);

	afterAll(async () => {
		await fs.rm(tmp, { force: true, recursive: true });
	});

	it("accepts the failure envelope on every JSON response", () => {
		// strict: false because the bundle is an OpenAPI document, not a bare
		// schema; Ajv still resolves the `#/components/...` refs inside it.
		const ajv = new Ajv2020({ strict: false });
		ajv.addSchema(bundle, "openapi");

		const operations: string[] = [];
		const rejected: string[] = [];
		for (const [route, methods] of Object.entries(bundle.paths)) {
			for (const method of Object.keys(methods)) {
				const pointer = [
					"paths",
					route,
					method,
					"responses",
					"200",
					"content",
					"application/json",
					"schema",
				]
					.map((part) => part.replaceAll("~", "~0").replaceAll("/", "~1"))
					.join("/");
				const validate = ajv.getSchema(`openapi#/${pointer}`);
				if (!validate) {
					continue;
				}
				const operation = `${method.toUpperCase()} ${route}`;
				operations.push(operation);
				if (!validate(FAILURE_ENVELOPE)) {
					rejected.push(`${operation}: ${ajv.errorsText(validate.errors)}`);
				}
			}
		}

		expect(operations.length).toBeGreaterThan(0);
		expect(rejected).toEqual([]);
	});
});

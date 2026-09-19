import { readFileSync } from "node:fs";
import path from "node:path";
import semver from "semver";
import { describe, expect, it } from "vitest";

/**
 * The declared Node floor has to be a version the toolchain can actually run.
 *
 * vitest 5 dropped Node 20 while `engines` still said `>=20.0.0` and three
 * documents still told people 20.x was supported. Nothing failed: npm prints
 * EBADENGINE and carries on, CI runs the version in `.node-version` (24.x),
 * and the mismatch only reaches a contributor who happens to be on 20. A
 * reviewer caught it that time. These tests mean the next one does not have to.
 */

const root = path.resolve(import.meta.dirname, "../..");

function readJson(relative: string): Record<string, never> {
	return JSON.parse(readFileSync(path.join(root, relative), "utf-8"));
}

const pkg = readJson("package.json") as unknown as {
	engines?: { node?: string };
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

const declaredRange = pkg.engines?.node;

/** The oldest Node this package claims to run on. */
function floor(): string {
	const min = semver.minVersion(declaredRange ?? "");
	if (!min) {
		throw new Error(`engines.node is not a usable range: ${declaredRange}`);
	}
	return min.version;
}

describe("the declared Node floor", () => {
	it("is a range with a concrete lower bound", () => {
		// `*` or a missing field would make every check below vacuous.
		expect(declaredRange).toBeTruthy();
		expect(() => floor()).not.toThrow();
	});

	it("matches what the MCP bundle tells Claude Desktop", () => {
		// Two files, one claim. They were both `>=20.0.0` and had to be edited
		// together; nothing but this test makes that a requirement.
		const manifest = readJson("mcpb/manifest.json") as unknown as {
			compatibility?: { runtimes?: { node?: string } };
		};

		expect(manifest.compatibility?.runtimes?.node).toBe(declaredRange);
	});

	it("is a version every direct dependency can run on", () => {
		// The check that would have caught vitest 5: our floor must satisfy
		// each dependency's own engines, or we are telling people to use a
		// Node that cannot install what we depend on.
		const lowest = floor();
		const direct = {
			...(pkg.dependencies ?? {}),
			...(pkg.devDependencies ?? {}),
		};

		const unsatisfied: string[] = [];
		for (const name of Object.keys(direct)) {
			let required: string | undefined;
			try {
				const dep = readJson(`node_modules/${name}/package.json`) as unknown as {
					engines?: { node?: string };
				};
				required = dep.engines?.node;
			} catch {
				// Not installed in this environment. Skipping is right: this
				// test is about agreement between declarations, and a missing
				// package has made none.
				continue;
			}
			if (!required || required === "*") {
				continue;
			}
			if (!semver.satisfies(lowest, required, { includePrerelease: true })) {
				unsatisfied.push(`${name} needs ${required}`);
			}
		}

		expect(unsatisfied).toEqual([]);
	});

	it("is the version the installation docs quote", () => {
		// The floor is a promise made to readers, not only to npm, and the
		// documents are where people actually look for it.
		const lowest = semver.coerce(floor());
		const quoted = `${lowest?.major}.${lowest?.minor}`;

		for (const doc of ["docs/installation.md", "docs/installation.ja.md"]) {
			const text = readFileSync(path.join(root, doc), "utf-8");
			expect(text, `${doc} should quote Node ${quoted}`).toContain(quoted);
		}
	});
});

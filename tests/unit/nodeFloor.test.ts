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

	it("admits only versions every direct dependency can run on", () => {
		// `semver.subset`, not "does the floor satisfy it". An earlier version
		// of this test checked only `minVersion()`, declared `>=22.18.0` and
		// passed — while that range still advertised Node 23.x and 25.x, which
		// vitest 5 does not support. Checking the lower bound can only catch a
		// floor that is too low; it is blind to everything the range lets in
		// above it, which is where the odd-numbered majors were hiding.
		const ours = declaredRange ?? "";
		const direct = {
			...(pkg.dependencies ?? {}),
			...(pkg.devDependencies ?? {}),
		};

		const unsatisfied: string[] = [];
		for (const name of Object.keys(direct)) {
			let required: string | undefined;
			try {
				const dep = readJson(
					`node_modules/${name}/package.json`,
				) as unknown as {
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
			if (!semver.subset(ours, required)) {
				unsatisfied.push(`${name} needs ${required}`);
			}
		}

		expect(unsatisfied).toEqual([]);
	});

	it("is what the lockfile records too", () => {
		// npm writes the root package's engines into the lockfile, so editing
		// package.json alone leaves a stale claim there and hands the next
		// contributor a dirty worktree the moment they run `npm install`.
		const lock = readJson("package-lock.json") as unknown as {
			packages?: Record<string, { engines?: { node?: string } }>;
		};

		expect(lock.packages?.[""]?.engines?.node).toBe(declaredRange);
	});

	it("is quoted in the installation docs, with the exclusion, every time", () => {
		// The range is a promise made to readers, and readers stop early. One
		// prerequisites section said "22.18+, 24.x or 26+" while the detailed
		// one below it named the unsupported odd majors — so a reader who read
		// only the first was still free to pick 23.x. Every statement of the
		// requirement has to carry the exclusion, not just the thorough one.
		const lowest = semver.coerce(floor());
		const quoted = `${lowest?.major}.${lowest?.minor}`;

		for (const doc of ["docs/installation.md", "docs/installation.ja.md"]) {
			const text = readFileSync(path.join(root, doc), "utf-8");
			expect(text, `${doc} should quote Node ${quoted}`).toContain(quoted);

			const statements = text
				.split("\n")
				.filter((line) => line.includes(quoted));
			expect(
				statements.length,
				`${doc} states the requirement`,
			).toBeGreaterThan(0);
			for (const line of statements) {
				// Naming 23.x is the shortest thing every phrasing of the
				// exclusion has in common, in either language.
				expect(line, `${doc}: unqualified requirement — ${line}`).toContain(
					"23",
				);
			}
		}
	});
});

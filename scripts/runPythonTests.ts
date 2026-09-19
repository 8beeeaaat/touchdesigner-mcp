/**
 * Run the TD-side Python tests, choosing an interpreter that can actually
 * import the modules under test.
 *
 * `npm test` fans out over `test:*`, so this has to stay friendly to a
 * contributor who only works on the TypeScript side and has no Python tooling
 * installed: it reports what to do and exits 0 rather than failing the whole
 * suite. CI is the opposite — a missing interpreter there means the tests
 * silently stopped running, so it exits non-zero.
 *
 * The floor is the version `pyproject.toml` declares, so these tests exercise
 * what the project says it supports rather than only the newest interpreter
 * to hand.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const testDir = join(rootDir, "tests", "python");
const MIN_PYTHON = [3, 9] as const;
const isCI = Boolean(process.env.CI);

type Candidate = { command: string; args: string[] };

function run(command: string, args: string[]) {
	return spawnSync(command, args, { cwd: rootDir, encoding: "utf-8" });
}

function has(command: string): boolean {
	return run(command, ["--version"]).status === 0;
}

/** Whether this interpreter is new enough to import the modules under test. */
function isSupported(python: string): boolean {
	// Compared field by field. `sys.version_info` is a tuple, and Python
	// refuses to order a tuple against a list — which a JSON-serialised array
	// would be, making every interpreter look unsupported.
	const [major, minor] = MIN_PYTHON;
	const result = run(python, [
		"-c",
		`import sys; sys.exit(0 if (sys.version_info.major, sys.version_info.minor) >= (${major}, ${minor}) else 1)`,
	]);
	return result.status === 0;
}

function pickRunner(): Candidate | null {
	// An installed runner is tried first. uv can provision one, but it reaches
	// the network to do so, which turns a runnable suite into a failure on a
	// machine that is offline or behind a proxy.
	for (const python of ["python3", "python"]) {
		if (!has(python) || !isSupported(python)) {
			continue;
		}
		if (run(python, ["-m", "pytest", "--version"]).status === 0) {
			return { args: ["-m", "pytest", testDir], command: python };
		}
	}

	if (has("pytest")) {
		return { args: [testDir], command: "pytest" };
	}

	// Nothing installed. uv needs no interpreter up front and pins the version
	// CI uses, at the cost of fetching it.
	if (has("uv")) {
		return {
			args: ["run", "--python", "3.13", "--with", "pytest", "pytest", testDir],
			command: "uv",
		};
	}

	return null;
}

const runner = pickRunner();

if (!runner) {
	const message = [
		"No Python interpreter with pytest was found.",
		`These tests need Python ${MIN_PYTHON.join(".")}+ and pytest:`,
		"  uv run --python 3.13 --with pytest pytest tests/python",
		"  # or: pip install pytest",
	].join("\n");

	if (isCI) {
		console.error(`${message}\nFailing because CI must run these tests.`);
		process.exit(1);
	}
	console.log(`${message}\nSkipping tests/python. CI runs them.`);
	process.exit(0);
}

const result = spawnSync(runner.command, runner.args, {
	cwd: rootDir,
	stdio: "inherit",
});
process.exit(result.status ?? 1);

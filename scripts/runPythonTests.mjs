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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const testDir = join(rootDir, "tests", "python");
const MIN_PYTHON = [3, 9];
const isCI = Boolean(process.env.CI);

/**
 * @param {string} command
 * @param {string[]} args
 */
function run(command, args) {
	return spawnSync(command, args, { cwd: rootDir, encoding: "utf-8" });
}

/** @param {string} command */
function has(command) {
	return run(command, ["--version"]).status === 0;
}

/** Whether this interpreter is new enough to import the modules under test. */
/** @param {string} python */
function isSupported(python) {
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

/**
 * The interpreter a console script runs under, from its shebang.
 *
 * Returns null when it cannot be read — an unreadable script is one we cannot
 * vouch for, and guessing is what this exists to avoid.
 */
/**
 * @param {string} command
 * @returns {string | null}
 */
function interpreterBehind(command) {
	const which = run(process.platform === "win32" ? "where" : "which", [
		command,
	]);
	if (which.status !== 0) {
		return null;
	}
	const scriptPath = which.stdout.split("\n")[0]?.trim();
	if (!scriptPath) {
		return null;
	}
	try {
		const firstLine = readFileSync(scriptPath, "utf-8").split("\n")[0] ?? "";
		const match = firstLine.match(/^#!\s*(\S+)/);
		if (!match) {
			return null;
		}
		// `#!/usr/bin/env python3` names the interpreter in the next field.
		const interpreter = match[1].endsWith("/env")
			? (firstLine.trim().split(/\s+/)[1] ?? null)
			: match[1];
		return interpreter;
	} catch {
		return null;
	}
}

/** @returns {{command: string, args: string[]} | null} */
function pickRunner() {
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

	// A bare `pytest` on PATH is a console script, and nothing so far has said
	// which interpreter runs it. Selecting it blind can hand the suite to a
	// version too old to import the modules under test, which then fails at
	// collection instead of falling through to something that works.
	const standalone = interpreterBehind("pytest");
	if (standalone && isSupported(standalone)) {
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

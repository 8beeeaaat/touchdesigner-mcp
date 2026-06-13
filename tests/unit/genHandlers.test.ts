import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import yaml from "yaml";
import {
	DEFAULT_TEMPLATE_PATH,
	extractOperations,
	generateHandlers,
} from "../../td/genHandlers.js";

// Minimal but representative OpenAPI fixture: exercises multiple HTTP methods on
// one path, a camelCase operationId (handlers convert these to snake_case at
// runtime), and a non-method path-item member (`parameters`) that must be ignored.
const FIXTURE_OPENAPI = `openapi: 3.0.0
info:
  title: Fixture
  version: 1.0.0
paths:
  /nodes:
    get:
      operationId: getTdNodes
      responses:
        "200":
          description: OK
    post:
      operationId: createNode
      responses:
        "200":
          description: OK
  /nodes/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    delete:
      operationId: deleteTdNode
      responses:
        "200":
          description: OK
`;

const EXPECTED_OPERATION_IDS = ["getTdNodes", "createNode", "deleteTdNode"];

/** Resolve an available Python interpreter, or null when none is installed. */
function findPython(): string | null {
	for (const candidate of ["python3", "python"]) {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return candidate;
		} catch {
			// try the next candidate
		}
	}
	return null;
}

describe("genHandlers", () => {
	let tmpDir: string;
	let openapiPath: string;
	let outputPath: string;

	beforeAll(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gen-handlers-"));
		openapiPath = path.join(tmpDir, "openapi.yaml");
		// Write into a nested, not-yet-existing dir to also assert mkdir -p behavior.
		outputPath = path.join(tmpDir, "generated", "generated_handlers.py");
		await fs.writeFile(openapiPath, FIXTURE_OPENAPI);
	});

	afterAll(async () => {
		await fs.rm(tmpDir, { force: true, recursive: true });
	});

	describe("extractOperations", () => {
		it("collects every operationId in declaration order and skips non-method members", () => {
			const operations = extractOperations(yaml.parse(FIXTURE_OPENAPI));
			expect(operations.map((o) => o.operationId)).toEqual(
				EXPECTED_OPERATION_IDS,
			);
		});

		it("returns an empty list when there are no paths", () => {
			expect(extractOperations({})).toEqual([]);
			expect(extractOperations(null)).toEqual([]);
		});
	});

	describe("generateHandlers", () => {
		it("renders one handler per operation using the real template and creates the output file", async () => {
			const { operations, rendered } = await generateHandlers({
				openapiPath,
				outputPath,
				templatePath: DEFAULT_TEMPLATE_PATH,
			});

			// Output file is created (including the missing parent directory).
			const written = await fs.readFile(outputPath, "utf-8");
			expect(written).toBe(rendered);

			expect(operations.map((o) => o.operationId)).toEqual(
				EXPECTED_OPERATION_IDS,
			);

			// Every operation yields a handler def and an __all__ entry.
			for (const operationId of EXPECTED_OPERATION_IDS) {
				expect(written).toContain(`def ${operationId}(`);
				expect(written).toContain(`"${operationId}",`);
			}
		});

		it("produces syntactically valid Python", async () => {
			const python = findPython();
			if (!python) {
				// No interpreter on this machine — the structural assertions above
				// still guard the template; skip only the syntax check.
				console.warn("Skipping py_compile check: no python interpreter found");
				return;
			}

			await generateHandlers({
				openapiPath,
				outputPath,
				templatePath: DEFAULT_TEMPLATE_PATH,
			});

			// py_compile validates syntax only (not imports), so the template's
			// `from utils.types import Result` etc. do not need to resolve here.
			expect(() =>
				execFileSync(python, ["-m", "py_compile", outputPath], {
					stdio: "pipe",
				}),
			).not.toThrow();
		});
	});
});

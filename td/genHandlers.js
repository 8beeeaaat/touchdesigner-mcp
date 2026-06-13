import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mustache from "mustache";
import yaml from "yaml";

export const DEFAULT_OPENAPI_PATH = path.resolve(
	"td/modules/td_server/openapi_server/openapi/openapi.yaml",
);
export const DEFAULT_TEMPLATE_PATH = path.resolve(
	"td/templates/mcp/api_controller_handlers.mustache",
);
export const DEFAULT_OUTPUT_PATH = path.resolve(
	"td/modules/mcp/controllers/generated_handlers.py",
);

/**
 * Collect every operationId declared in an OpenAPI document, in path/method
 * declaration order. Non-method path-item members (e.g. `parameters`) carry no
 * operationId and are skipped.
 */
export function extractOperations(openapiDoc) {
	const operations = [];
	if (!openapiDoc?.paths) {
		return operations;
	}
	for (const pathKey of Object.keys(openapiDoc.paths)) {
		const methods = openapiDoc.paths[pathKey];
		for (const methodKey of Object.keys(methods)) {
			const operation = methods[methodKey];
			if (operation?.operationId) {
				operations.push({ operationId: operation.operationId });
			}
		}
	}
	return operations;
}

/**
 * Render the Python MCP handler stubs from the bundled OpenAPI spec.
 * Rejects (rather than exiting) on any I/O or parse error so callers/tests can
 * react; the CLI entrypoint below maps a rejection to a non-zero exit.
 */
export async function generateHandlers({
	openapiPath = DEFAULT_OPENAPI_PATH,
	templatePath = DEFAULT_TEMPLATE_PATH,
	outputPath = DEFAULT_OUTPUT_PATH,
} = {}) {
	const yamlContent = await fs.readFile(openapiPath, "utf-8");
	const openapiDoc = yaml.parse(yamlContent);
	const operations = extractOperations(openapiDoc);

	const template = await fs.readFile(templatePath, "utf-8");
	const rendered = mustache.render(template, { operations });

	await fs.mkdir(path.dirname(outputPath), { recursive: true });
	await fs.writeFile(outputPath, rendered);

	return { operations, outputPath, rendered };
}

const isMain =
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	generateHandlers()
		.then(() => {
			console.log("✅ generated_handlers.py created successfully!");
		})
		.catch((error) => {
			console.error("❌ Error generating handlers:", error);
			process.exit(1);
		});
}

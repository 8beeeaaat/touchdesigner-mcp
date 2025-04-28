import path from "node:path";
import fs from "fs-extra";
import mustache from "mustache";
import yaml from "yaml";

const openapiPath = path.resolve(
	"td/modules/td_server/openapi_server/openapi/openapi.yaml",
);
const templatePath = path.resolve(
	"td/templates/mcp/api_controller_handlers.mustache",
);
const outputPath = path.resolve(
	"td/modules/mcp/controllers/generated_handlers.py",
);

async function generateHandlers() {
	try {
		const yamlContent = await fs.readFile(openapiPath, "utf-8");
		const openapiDoc = yaml.parse(yamlContent);
		const operations = [];

		if (openapiDoc.paths) {
			for (const pathKey of Object.keys(openapiDoc.paths)) {
				const methods = openapiDoc.paths[pathKey];
				for (const methodKey of Object.keys(methods)) {
					const operation = methods[methodKey];
					if (operation.operationId) {
						operations.push({ operationId: operation.operationId });
					}
				}
			}
		}
		const template = await fs.readFile(templatePath, "utf-8");
		const rendered = mustache.render(template, {
			operations,
		});

		await fs.outputFile(outputPath, rendered);

		console.log("✅ generated_handlers.py created successfully!");
	} catch (error) {
		console.error("❌ Error generating handlers:", error);
		process.exit(1);
	}
}

generateHandlers();

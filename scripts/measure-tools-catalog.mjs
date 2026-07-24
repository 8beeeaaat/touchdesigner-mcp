#!/usr/bin/env node
/**
 * Measure the published MCP tools/list catalog size.
 * Run: npm run build && node scripts/measure-tools-catalog.mjs
 */
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function main() {
	const distPath = join(root, "dist/features/tools/measureToolCatalog.js");
	let measure;
	try {
		measure = await import(pathToFileURL(distPath).href);
	} catch {
		console.error(
			"dist/features/tools/measureToolCatalog.js missing — run npm run build first, or:\n  npx vitest run tests/unit/slimSchemaForMcp.test.ts",
		);
		process.exit(1);
	}

	const result = measure.measureToolCatalog();
	const label = "est. (chars/1.5, JSON-calibrated)";
	console.log(
		JSON.stringify(
			{
				budget: result.budget,
				bytes: result.bytes,
				chars: result.chars,
				honesty: { chars: "measured", tokens: label },
				toolCount: result.toolCount,
				tokensEst: result.tokensEst,
				underBudget: result.underBudget,
			},
			null,
			2,
		),
	);
	if (!result.underBudget) {
		process.exit(2);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

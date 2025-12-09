import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const entryFile = resolve("src/features/tools/ui/src/feature/nodeBrowser.tsx");
const outFile = resolve("dist/feature/ui/nodeBrowser.js");

async function main() {
	await mkdir(resolve("dist/feature/ui"), { recursive: true });

	await build({
		bundle: true,
		entryPoints: [entryFile],
		format: "iife",
		jsx: "automatic",
		minify: true,
		outfile: outFile,
		platform: "browser",
		sourcemap: false,
		target: "es2019",
	});

	console.log(`Built TD node browser bundle -> ${outFile}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

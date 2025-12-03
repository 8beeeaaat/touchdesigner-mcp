/** biome-ignore-all lint/suspicious/noExplicitAny: type safety not required for build script */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const packageJsonPath = join(rootDir, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const packageVersion = packageJson.version;

if (!packageVersion) {
	throw new Error("package.json does not contain a version field.");
}

const updatedFiles: string[] = [];

const writeTextFile = (
	relativePath: string,
	updater: (data: any, version: string) => any,
) => {
	const absPath = join(rootDir, relativePath);
	const original = readFileSync(absPath, "utf8");
	const next = updater(original, packageVersion);
	writeFileSync(absPath, next, "utf8");
	updatedFiles.push(relativePath);
};

writeTextFile("pyproject.toml", (contents) => {
	return contents.replace(
		/version\s*=\s*"[^"]+"/,
		`version = "${packageVersion}"`,
	);
});

writeTextFile("td/modules/utils/version.py", (contents) => {
	return contents.replace(
		/MCP_API_VERSION\s*=\s*"[^"]+"/,
		`MCP_API_VERSION = "${packageVersion}"`,
	);
});

writeTextFile("src/api/index.yml", (contents) => {
	return contents.replace(/version:\s*[\d.]+/, `version: ${packageVersion}`);
});

console.log(
	`Synchronized version ${packageVersion} across: ${updatedFiles.join(", ")}`,
);

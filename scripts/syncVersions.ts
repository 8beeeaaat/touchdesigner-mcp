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

const writeJsonFile = (
	relativePath: string,
	updater: (data: any, version: string) => any,
) => {
	const absPath = join(rootDir, relativePath);
	const original = readFileSync(absPath, "utf8");
	const parsed = JSON.parse(original);
	const next = updater(parsed, packageVersion);
	writeFileSync(absPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
	updatedFiles.push(relativePath);
};

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

writeJsonFile("mcpb/manifest.json", (manifest) => {
	return {
		...manifest,
		version: packageVersion,
	};
});

writeJsonFile("server.json", (serverConfig) => {
	const updatedPackages = serverConfig.packages?.map(
		(pkg: {
			registryType: string;
			identifier: string | Record<string, unknown>;
			version: string;
		}) => {
			if (pkg.registryType === "npm") {
				return {
					...pkg,
					version: packageVersion,
				};
			}

			if (pkg.registryType === "mcpb") {
				const updatedIdentifier =
					typeof pkg.identifier === "string"
						? pkg.identifier.replace(
								/\/download\/v[^/]+\//,
								`/download/v${packageVersion}/`,
							)
						: pkg.identifier;
				return {
					...pkg,
					identifier: updatedIdentifier,
					version: packageVersion,
				};
			}

			return pkg;
		},
	);

	return {
		...serverConfig,
		packages: updatedPackages,
		version: packageVersion,
	};
});

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

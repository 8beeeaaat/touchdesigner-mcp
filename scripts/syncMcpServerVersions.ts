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

const writeJsonFile = <T extends Record<string, unknown>>(
	relativePath: string,
	updater: (data: T, version: string) => T,
) => {
	const absPath = join(rootDir, relativePath);
	const original = readFileSync(absPath, "utf8");
	const parsed = JSON.parse(original) as T;
	const next = updater(parsed, packageVersion);
	writeFileSync(absPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
	updatedFiles.push(relativePath);
};

writeJsonFile("mcpb/manifest.json", (manifest) => {
	return {
		...manifest,
		version: packageVersion,
	};
});

interface PackageEntry {
	registryType: string;
	identifier: string | Record<string, unknown>;
	version: string;
}

interface ServerConfig {
	packages?: PackageEntry[];
	version: string;
	[key: string]: unknown;
}

writeJsonFile<ServerConfig>("server.json", (serverConfig) => {
	const updatedPackages = serverConfig.packages?.map((pkg) => {
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
	});

	return {
		...serverConfig,
		packages: updatedPackages,
		version: packageVersion,
	};
});

console.log(
	`Synchronized MCP Server version ${packageVersion} across: ${updatedFiles.join(", ")}`,
);

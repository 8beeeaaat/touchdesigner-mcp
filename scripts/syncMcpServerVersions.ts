import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

const mcpbPath = join(rootDir, "touchdesigner-mcp.mcpb");
const mcpbSha256 = (() => {
	if (!existsSync(mcpbPath)) {
		throw new Error(
			"touchdesigner-mcp.mcpb not found. Run `npm run build:mcpb` before `npm run version:mcp`.",
		);
	}
	const output = execFileSync("openssl", ["dgst", "-sha256", mcpbPath], {
		encoding: "utf8",
	}).trim();
	const match = output.match(/=\s*([0-9a-fA-F]{64})$/);
	if (!match) {
		throw new Error(`Failed to parse SHA-256 from openssl output: ${output}`);
	}
	return match[1].toLowerCase();
})();

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
				fileSha256: mcpbSha256,
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

// Anthropic's plugin directory rejects a range such as `^2` in an npx
// launcher, so the plugin names the exact release this commit publishes.
// Tabs keep the file byte-identical to how Biome formats it.
interface PluginMcpConfig {
	mcpServers: Record<string, { args: string[]; [key: string]: unknown }>;
}

const pluginMcpPath = "plugin/touchdesigner/.mcp.json";
{
	const absPath = join(rootDir, pluginMcpPath);
	const config = JSON.parse(readFileSync(absPath, "utf8")) as PluginMcpConfig;
	let pinned = 0;
	for (const server of Object.values(config.mcpServers)) {
		server.args = server.args.map((arg) => {
			if (!arg.startsWith("touchdesigner-mcp-server@")) return arg;
			pinned++;
			return `touchdesigner-mcp-server@${packageVersion}`;
		});
	}
	if (pinned !== 1) {
		throw new Error(
			`${pluginMcpPath} must name touchdesigner-mcp-server@<version> exactly once; found ${pinned}.`,
		);
	}
	writeFileSync(absPath, `${JSON.stringify(config, null, "\t")}\n`, "utf8");
	updatedFiles.push(pluginMcpPath);
}

console.log(
	`Synchronized MCP Server version ${packageVersion} across: ${updatedFiles.join(", ")}`,
);

import { createRequire } from "node:module";

const requirePackage = createRequire(import.meta.url);

type PackageJson = {
	version?: string;
};

const packageJson = requirePackage("../../package.json") as PackageJson;

export const PACKAGE_VERSION = packageJson.version ?? "0.0.0";

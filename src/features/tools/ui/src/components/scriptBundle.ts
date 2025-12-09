import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface LoadScriptBundleOptions {
	replacements?: Record<string, string>;
	relativePath: string;
}

export function loadScriptBundle({
	replacements,
	relativePath,
}: LoadScriptBundleOptions): string {
	const absolutePath = resolve(process.cwd(), relativePath);
	if (!existsSync(absolutePath)) {
		throw new Error(
			`UI bundle not found at ${absolutePath}. Run the UI build to generate it.`,
		);
	}

	let content = readFileSync(absolutePath, "utf8");
	if (replacements) {
		for (const [token, value] of Object.entries(replacements)) {
			content = content.split(token).join(value);
		}
	}

	return escapeScriptContent(content);
}

export function escapeScriptContent(value: string): string {
	return value.replace(/<\/script/gi, "<\\/script");
}

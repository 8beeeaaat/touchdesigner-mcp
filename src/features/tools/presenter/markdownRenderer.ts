import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Mustache from "mustache";

type Context = Record<string, unknown>;

const templatesDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"./templates/markdown",
);

const templateCache = new Map<string, string>();

export function renderMarkdownTemplate(
	templateName: string,
	context: Context = {},
): string {
	const template = loadTemplate(templateName);
	return Mustache.render(template, context).trim();
}

function loadTemplate(name: string): string {
	const fileName = `${name}.md`;
	const fullPath = path.join(templatesDir, fileName);
	if (!templateCache.has(fileName)) {
		let content: string;
		try {
			content = readFileSync(fullPath, "utf-8");
		} catch {
			content = readFileSync(path.join(templatesDir, "default.md"), "utf-8");
		}
		templateCache.set(fileName, content);
	}
	return templateCache.get(fileName) ?? "";
}

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
	const cached = templateCache.get(fileName);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const content = readFileSync(path.join(templatesDir, fileName), "utf-8");
		if (!content.trim()) {
			// An empty read is a failed read. A partially written file from an
			// interrupted copy parses as a template that renders nothing, so
			// every report would come back blank rather than wrong.
			throw new Error("template is empty");
		}
		templateCache.set(fileName, content);
		return content;
	} catch (error) {
		// Not cached: a template that failed to read once may read next time,
		// and caching the fallback would make a single transient error degrade
		// every response for the life of the process. It matters more than it
		// looks — nodeErrorSummary.md carries every notice the error report
		// can print, and default.md is a title and a line of text, so a
		// missing template turns a warning about an unread stream into
		// silence rather than into a formatting glitch.
		console.error(
			`[presenter] template ${fileName} unreadable, falling back to default.md:`,
			error instanceof Error ? error.message : error,
		);
		return readFileSync(path.join(templatesDir, "default.md"), "utf-8");
	}
}

import { mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { renderMarkdownTemplate } from "../../../src/features/tools/presenter/markdownRenderer.js";

/**
 * The fallback matters more than it looks.
 *
 * `nodeErrorSummary.md` carries every notice the error report can print — an
 * unread stream, an uninspected warning stream, counts that disagree, three
 * kinds of uncertain attribution. `default.md` is a title and a line of text.
 * So a template that cannot be read turns a warning into silence rather than
 * into a formatting glitch, and caching that outcome would make one transient
 * failure permanent for the life of the process.
 */
describe("renderMarkdownTemplate", () => {
	const templatesDir = path.join(
		process.cwd(),
		"src/features/tools/presenter/templates/markdown",
	);
	const target = path.join(templatesDir, "nodeErrorSummary.md");
	const stash = path.join(
		mkdtempSync(path.join(tmpdir(), "tpl-")),
		"stashed.md",
	);

	beforeAll(() => {
		renameSync(target, stash);
	});

	afterAll(() => {
		renameSync(stash, target);
		rmSync(path.dirname(stash), { force: true, recursive: true });
	});

	it("falls back when a template cannot be read, and says so", () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});

		const output = renderMarkdownTemplate("nodeErrorSummary", {
			text: "Node /project1/probe: 1 error(s).",
		});

		expect(output).toContain("Node /project1/probe");
		expect(logged).toHaveBeenCalled();
		logged.mockRestore();
	});

	it("does not cache the fallback", () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		renderMarkdownTemplate("nodeErrorSummary", { text: "first" });
		logged.mockRestore();

		renameSync(stash, target);
		try {
			const output = renderMarkdownTemplate("nodeErrorSummary", {
				entries: [],
				errorCount: 0,
				nodeName: "probe",
				nodePath: "/project1/probe",
				warningCount: 0,
			});

			// The real template renders a header the fallback cannot produce.
			expect(output).toContain("Errors: 0");
		} finally {
			renameSync(target, stash);
		}
	});

	it("treats an empty template as unreadable", () => {
		// Its own name: the cache is module-level and the case above warms it
		// with the real template, which would mask this entirely.
		const empty = path.join(templatesDir, "emptyProbeTemplate.md");
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		writeFileSync(empty, "   \n");
		try {
			const output = renderMarkdownTemplate("emptyProbeTemplate", {
				text: "Node /project1/probe: 1 error(s).",
			});

			expect(output).toContain("Node /project1/probe");
			expect(logged).toHaveBeenCalled();
		} finally {
			rmSync(empty, { force: true });
			logged.mockRestore();
		}
	});
});

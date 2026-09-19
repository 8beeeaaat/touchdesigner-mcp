import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderMarkdownTemplate } from "../../../src/features/tools/presenter/markdownRenderer.js";

const { readFileSync: readFromDisk } =
	await vi.importActual<typeof import("node:fs")>("node:fs");

// Only the read is intercepted, and only for the template this test names.
// The previous version moved the real `nodeErrorSummary.md` aside with
// `renameSync` for the duration of the file, which made a source file that
// other work reads disappear for a moment: `npm test` is `run-p test:*`, so
// `test:unit` and `test:integration` run as separate processes at the same
// time, and `tests/integration/nodeErrorsTool.test.ts` asserts the markdown
// that same template renders. Vitest isolates files, not processes, so
// nothing could serialise those two — the integration suite would have
// rendered the fallback and failed, sometimes.
vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return { ...actual, readFileSync: vi.fn(actual.readFileSync) };
});

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
	const reads = vi.mocked(readFileSync);

	/** Let every read reach the real templates directory again. */
	function readEverythingFromDisk() {
		reads.mockImplementation(readFromDisk as unknown as typeof readFileSync);
	}

	/**
	 * Answer for one template name; every other read still goes to disk.
	 *
	 * `default.md` has to stay readable — it is what the fallback returns —
	 * so this cannot be a blanket mock.
	 */
	function answerFor(name: string, answer: string | Error) {
		reads.mockImplementation(((file: Parameters<typeof readFileSync>[0]) => {
			if (!String(file).endsWith(`${name}.md`)) {
				return readFromDisk(file, "utf-8");
			}
			if (answer instanceof Error) {
				throw answer;
			}
			return answer;
		}) as unknown as typeof readFileSync);
	}

	afterEach(readEverythingFromDisk);

	it("falls back when a template cannot be read, and says so", () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		answerFor("nodeErrorSummary", new Error("ENOENT: no such file"));

		const output = renderMarkdownTemplate("nodeErrorSummary", {
			text: "Node /project1/probe: 1 error(s).",
		});

		expect(output).toContain("Node /project1/probe");
		expect(logged).toHaveBeenCalled();
		logged.mockRestore();
	});

	it("does not cache the fallback", () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		answerFor("nodeErrorSummary", new Error("ENOENT: no such file"));
		renderMarkdownTemplate("nodeErrorSummary", { text: "first" });
		logged.mockRestore();

		// Readable again, in the same process, with the module-level cache
		// untouched: if the failure above had been cached, this would still
		// come back as the fallback.
		readEverythingFromDisk();

		const output = renderMarkdownTemplate("nodeErrorSummary", {
			entries: [],
			errorCount: 0,
			nodeName: "probe",
			nodePath: "/project1/probe",
			warningCount: 0,
		});

		// The real template renders a header the fallback cannot produce.
		expect(output).toContain("Errors: 0");
	});

	it("treats an empty template as unreadable", () => {
		// Its own name: the cache is module-level and the case above warms it
		// with the real template, which would mask this entirely.
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		answerFor("emptyProbeTemplate", "   \n");

		const output = renderMarkdownTemplate("emptyProbeTemplate", {
			text: "Node /project1/probe: 1 error(s).",
		});

		expect(output).toContain("Node /project1/probe");
		expect(logged).toHaveBeenCalled();
		logged.mockRestore();
	});
});

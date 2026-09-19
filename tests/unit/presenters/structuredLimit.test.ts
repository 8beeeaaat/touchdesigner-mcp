/**
 * `limit` in the structured formats.
 *
 * The markdown branch of the presenter reads the limited context; `json` and
 * `yaml` read `payload.structured`. Every case below asks the same two
 * questions of a formatter that accepts `limit`:
 *
 *  1. does the structured payload actually stop at the cap, and
 *  2. does it say so — a payload cut down to N with no marker is the same
 *     defect one layer down, since the caller cannot tell it from a short list.
 *
 * `detailLevel: "detailed"` is the escape hatch that makes a cap safe to
 * apply, so each formatter is also asked to leave it alone.
 */

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
	formatClassDetails,
	formatClassList,
} from "../../../src/features/tools/presenter/classListFormatter.js";
import { formatNodeDetails } from "../../../src/features/tools/presenter/nodeDetailsFormatter.js";
import { formatNodeErrors } from "../../../src/features/tools/presenter/nodeErrorsFormatter.js";
import { formatNodeList } from "../../../src/features/tools/presenter/nodeListFormatter.js";
import type { FormatterOptions } from "../../../src/features/tools/presenter/responseFormatter.js";
import type {
	TdNode,
	TdNodeError,
	TdNodeErrorReport,
	TdPythonClassDetails,
} from "../../../src/gen/endpoints/TouchDesignerAPI.js";

/** The two formats that read `structured` rather than the markdown context. */
const structuredFormats = ["json", "yaml"] as const;
type StructuredFormat = (typeof structuredFormats)[number];

/**
 * Parse a response back into the payload the caller receives.
 *
 * Parsing rather than matching substrings: an assertion on the rendered text
 * passes just as happily on `"limit": 2` sitting next to two hundred entries.
 */
function payloadOf(
	text: string,
	format: StructuredFormat,
): Record<string, unknown> {
	return (format === "json" ? JSON.parse(text) : parseYaml(text)) as Record<
		string,
		unknown
	>;
}

function truncationOf(payload: Record<string, unknown>) {
	return payload.truncation as
		| {
				limit: number;
				collections: Record<
					string,
					{ total: number; returned: number; omitted: number }
				>;
		  }
		| undefined;
}

describe("limit in the structured formats", () => {
	describe("formatNodeErrors", () => {
		const entry = (name: string, level: TdNodeError["level"]): TdNodeError => ({
			level,
			message: `failure in ${name}`,
			nodeName: name,
			nodePath: `/project1/probe/${name}`,
			opType: "constantTOP",
		});

		const paths = (prefix: string, count: number) =>
			Array.from({ length: count }, (_, i) => ({
				path: `/project1/probe/${prefix}${i}`,
				stream: "errors",
			}));

		const report = (
			overrides: Partial<TdNodeErrorReport> = {},
		): TdNodeErrorReport => {
			const errors = Array.from({ length: 6 }, (_, i) =>
				entry(`err${i}`, "error"),
			);
			const warnings = Array.from({ length: 4 }, (_, i) =>
				entry(`warn${i}`, "warning"),
			);
			return {
				errorCount: errors.length,
				errors,
				hasErrors: true,
				hasWarnings: true,
				nodeName: "probe",
				nodePath: "/project1/probe",
				opType: "baseCOMP",
				warningCount: warnings.length,
				warnings,
				...overrides,
			};
		};

		const run = (options: FormatterOptions) =>
			formatNodeErrors(report(), options);

		it.each(structuredFormats)(
			"stops the entries at the limit in %s",
			(responseFormat) => {
				const payload = payloadOf(
					run({ limit: 4, responseFormat }),
					responseFormat,
				);

				// The cap spans both collections, errors first: four of the six
				// errors, none of the warnings.
				expect(payload.errors).toHaveLength(4);
				expect(payload.warnings).toHaveLength(0);
			},
		);

		it.each(structuredFormats)(
			"spends the remainder of the limit on warnings in %s",
			(responseFormat) => {
				const payload = payloadOf(
					run({ limit: 8, responseFormat }),
					responseFormat,
				);

				expect(payload.errors).toHaveLength(6);
				expect(payload.warnings).toHaveLength(2);
			},
		);

		it.each(structuredFormats)(
			"says the entries were cut in %s",
			(responseFormat) => {
				const payload = payloadOf(
					run({ limit: 4, responseFormat }),
					responseFormat,
				);

				expect(payload.truncated).toBe(true);
				expect(truncationOf(payload)?.limit).toBe(4);
				expect(truncationOf(payload)?.collections.errors).toEqual({
					omitted: 2,
					returned: 4,
					total: 6,
				});
				expect(truncationOf(payload)?.collections.warnings).toEqual({
					omitted: 4,
					returned: 0,
					total: 4,
				});
			},
		);

		it("keeps the server counts as the ceiling", () => {
			// The counts are what tells a reader how much was left behind, so
			// rewriting them to match the shortened arrays would make the
			// truncated payload self-consistent and wrong.
			const payload = payloadOf(
				run({ limit: 2, responseFormat: "json" }),
				"json",
			);

			expect(payload.errorCount).toBe(6);
			expect(payload.warningCount).toBe(4);
		});

		it("caps the caveat lists with the same limit", () => {
			const text = formatNodeErrors(
				report({
					fallbackAttributions: paths("fb", 9),
					lookupFailures: paths("lf", 9),
					unresolvedAnchors: paths("ua", 9),
				}),
				{ limit: 3, responseFormat: "json" },
			);
			const payload = payloadOf(text, "json");

			expect(payload.unresolvedAnchors).toHaveLength(3);
			expect(payload.fallbackAttributions).toHaveLength(3);
			expect(payload.lookupFailures).toHaveLength(3);
			expect(
				truncationOf(payload)?.collections.unresolvedAnchors?.omitted,
			).toBe(6);
			expect(
				truncationOf(payload)?.collections.fallbackAttributions?.omitted,
			).toBe(6);
			expect(truncationOf(payload)?.collections.lookupFailures?.omitted).toBe(
				6,
			);
		});

		it("does not invent a caveat list the report never sent", () => {
			// An absent list means the component did not report on it. Writing
			// an empty array in its place answers a question nobody asked, and
			// reads as "none found".
			const payload = payloadOf(
				run({ limit: 2, responseFormat: "json" }),
				"json",
			);

			expect(payload).not.toHaveProperty("unresolvedAnchors");
			expect(payload).not.toHaveProperty("lookupFailures");
			expect(payload).not.toHaveProperty("fallbackAttributions");
		});

		it("does not give a legacy report an empty warnings list", () => {
			// A component predating warning collection sends no `warnings` at
			// all, which is not the same as a node having none — the whole
			// point of `warningsUnknown`. Capping the report must not answer
			// that question on the component's behalf.
			const legacy: TdNodeErrorReport = {
				errorCount: 6,
				errors: Array.from({ length: 6 }, (_, i) => entry(`err${i}`, "error")),
				hasErrors: true,
				nodeName: "probe",
				nodePath: "/project1/probe",
				opType: "baseCOMP",
			};

			const payload = payloadOf(
				formatNodeErrors(legacy, { limit: 2, responseFormat: "json" }),
				"json",
			);

			expect(payload.errors).toHaveLength(2);
			expect(payload).not.toHaveProperty("warnings");
		});

		it.each(structuredFormats)(
			"leaves detailLevel 'detailed' uncapped in %s",
			(responseFormat) => {
				const payload = payloadOf(
					run({ detailLevel: "detailed", limit: 2, responseFormat }),
					responseFormat,
				);

				expect(payload.errors).toHaveLength(6);
				expect(payload.warnings).toHaveLength(4);
				expect(payload).not.toHaveProperty("truncation");
			},
		);

		it.each(structuredFormats)(
			"leaves a payload with no limit untouched in %s",
			(responseFormat) => {
				const data = report();

				const payload = payloadOf(run({ responseFormat }), responseFormat);

				expect(payload).toEqual(JSON.parse(JSON.stringify(data)));
			},
		);
	});

	describe("formatClassList", () => {
		const classes = Array.from({ length: 7 }, (_, i) => ({
			description: `class number ${i}`,
			name: `Class${i}`,
			type: "class" as const,
		}));
		const data = { classes, modules: ["td", "tdu"] };

		it.each(structuredFormats)(
			"stops the classes at the limit in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatClassList(data, { limit: 3, responseFormat }),
					responseFormat,
				);

				expect(payload.classes).toHaveLength(3);
				expect(payload.classCount).toBe(7);
			},
		);

		it.each(structuredFormats)(
			"says the classes were cut in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatClassList(data, { limit: 3, responseFormat }),
					responseFormat,
				);

				expect(payload.truncated).toBe(true);
				expect(truncationOf(payload)?.collections.classes).toEqual({
					omitted: 4,
					returned: 3,
					total: 7,
				});
			},
		);

		it("stops the classes at the limit in markdown too", () => {
			// The classListSummary template renders the class list from the
			// context and never renders the pre-built text, so the limit the
			// text applied was reaching nobody.
			const text = formatClassList(data, { limit: 3 });

			const bullets = text
				.split("\n")
				.filter((line) => line.startsWith("- `Class"));
			expect(bullets).toHaveLength(3);
			expect(text).toContain("4 more class(es) omitted");
		});

		it.each(structuredFormats)(
			"leaves detailLevel 'detailed' uncapped in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatClassList(data, {
						detailLevel: "detailed",
						limit: 3,
						responseFormat,
					}),
					responseFormat,
				);

				expect(payload.classes).toHaveLength(7);
				expect(payload).not.toHaveProperty("truncation");
			},
		);

		it.each(structuredFormats)(
			"leaves a payload with no limit untouched in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatClassList(data, { responseFormat }),
					responseFormat,
				);

				expect(payload.classes).toHaveLength(7);
				expect(payload).not.toHaveProperty("truncation");
				expect(payload).not.toHaveProperty("truncated");
			},
		);
	});

	describe("formatClassDetails", () => {
		const details: TdPythonClassDetails = {
			description: "A TouchDesigner operator",
			methods: Array.from({ length: 5 }, (_, i) => ({
				description: `does ${i}`,
				name: `method${i}`,
				signature: `method${i}()`,
			})),
			name: "OP",
			properties: Array.from({ length: 5 }, (_, i) => ({
				name: `prop${i}`,
				type: "string",
			})),
			type: "class",
		};

		it.each(structuredFormats)(
			"stops the members at the limit and says so in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatClassDetails(details, { limit: 2, responseFormat }),
					responseFormat,
				);

				expect(payload.methods).toHaveLength(2);
				expect(payload.properties).toHaveLength(2);
				expect(payload.truncated).toBe(true);
				expect(truncationOf(payload)?.collections.methods).toEqual({
					omitted: 3,
					returned: 2,
					total: 5,
				});
				expect(truncationOf(payload)?.collections.properties).toEqual({
					omitted: 3,
					returned: 2,
					total: 5,
				});
			},
		);

		it.each(structuredFormats)(
			"leaves detailLevel 'detailed' uncapped in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatClassDetails(details, {
						detailLevel: "detailed",
						limit: 2,
						responseFormat,
					}),
					responseFormat,
				);

				expect(payload.methods).toHaveLength(5);
				expect(payload.properties).toHaveLength(5);
				expect(payload).not.toHaveProperty("truncation");
			},
		);

		it.each(structuredFormats)(
			"leaves a payload with no limit untouched in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatClassDetails(details, { responseFormat }),
					responseFormat,
				);

				expect(payload.methods).toHaveLength(5);
				expect(payload).not.toHaveProperty("truncation");
				expect(payload.truncated).toBe(false);
			},
		);
	});

	describe("formatNodeList", () => {
		const nodes: TdNode[] = Array.from({ length: 6 }, (_, i) => ({
			id: i,
			name: `node${i}`,
			opType: "constantTOP",
			path: `/project1/node${i}`,
			properties: {},
		}));
		const data = { nodes, parentPath: "/project1" };

		const listed = (payload: Record<string, unknown>) =>
			(payload.groups as Array<{ nodes: unknown[] }>).flatMap(
				(group) => group.nodes,
			);

		it.each(structuredFormats)(
			"stops the nodes at the limit and says so in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatNodeList(data, { limit: 2, responseFormat }),
					responseFormat,
				);

				expect(listed(payload)).toHaveLength(2);
				expect(payload.truncated).toBe(true);
				expect(truncationOf(payload)?.collections.nodes).toEqual({
					omitted: 4,
					returned: 2,
					total: 6,
				});
			},
		);

		it("still admits the cut when the omission hint is suppressed", () => {
			// includeHints only governs the human-readable hint. The structured
			// payload is data, and a payload holding two of six nodes while
			// reporting nothing omitted is the defect this issue is about.
			const payload = payloadOf(
				formatNodeList(data, {
					includeHints: false,
					limit: 2,
					responseFormat: "json",
				}),
				"json",
			);

			expect(listed(payload)).toHaveLength(2);
			expect(payload.truncated).toBe(true);
			expect(payload.omittedCount).toBe(4);
		});

		it("keeps suppressing the markdown hint when includeHints is false", () => {
			const text = formatNodeList(data, {
				includeHints: false,
				limit: 2,
				responseFormat: "markdown",
			});

			expect(text).not.toContain("omitted");
		});

		it.each(structuredFormats)(
			"leaves detailLevel 'detailed' uncapped in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatNodeList(data, {
						detailLevel: "detailed",
						limit: 2,
						responseFormat,
					}),
					responseFormat,
				);

				expect(payload.nodes).toHaveLength(6);
				expect(payload).not.toHaveProperty("truncation");
			},
		);

		it.each(structuredFormats)(
			"leaves a payload with no limit untouched in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatNodeList(data, { responseFormat }),
					responseFormat,
				);

				expect(listed(payload)).toHaveLength(6);
				expect(payload).not.toHaveProperty("truncation");
				expect(payload.truncated).toBe(false);
				expect(payload.omittedCount).toBe(0);
			},
		);
	});

	describe("formatNodeDetails", () => {
		const data: TdNode = {
			id: 1,
			name: "text1",
			opType: "textTOP",
			path: "/project1/text1",
			properties: Object.fromEntries(
				Array.from({ length: 6 }, (_, i) => [`par${i}`, i]),
			),
		};

		it.each(structuredFormats)(
			"stops the properties at the limit and says so in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatNodeDetails(data, { limit: 2, responseFormat }),
					responseFormat,
				);

				expect(payload.properties).toHaveLength(2);
				expect(payload.truncated).toBe(true);
				expect(truncationOf(payload)?.collections.properties).toEqual({
					omitted: 4,
					returned: 2,
					total: 6,
				});
			},
		);

		it.each(structuredFormats)(
			"leaves detailLevel 'detailed' uncapped in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatNodeDetails(data, {
						detailLevel: "detailed",
						limit: 2,
						responseFormat,
					}),
					responseFormat,
				);

				expect(Object.keys(payload.properties as object)).toHaveLength(6);
				expect(payload).not.toHaveProperty("truncation");
			},
		);

		it.each(structuredFormats)(
			"leaves a payload with no limit untouched in %s",
			(responseFormat) => {
				const payload = payloadOf(
					formatNodeDetails(data, { responseFormat }),
					responseFormat,
				);

				expect(payload.properties).toHaveLength(6);
				expect(payload).not.toHaveProperty("truncation");
				expect(payload.truncated).toBe(false);
			},
		);
	});
});

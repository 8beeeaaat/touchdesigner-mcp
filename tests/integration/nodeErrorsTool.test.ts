import type { McpServer } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../../src/core/constants.js";
import type { ILogger } from "../../src/core/logger.js";
import { registerTools } from "../../src/features/tools/register.js";
import { TOOL_DEFINITIONS } from "../../src/features/tools/toolDefinitions.js";
import type { TdNodeErrorReport } from "../../src/gen/endpoints/TouchDesignerAPI.js";
import type { TouchDesignerClient } from "../../src/tdClient/index.js";

type ToolHandler = (params?: Record<string, unknown>) => Promise<{
	content?: Array<{ type: string; text?: string }>;
}>;

class MockMcpServer {
	public tools = new Map<string, ToolHandler>();
	// The config is what `tools/list` sends, and it is the only place a
	// model sees `description`. Dropping it here — as this mock used to —
	// left that string untested at the layer it is written for.
	public configs = new Map<string, { description?: string }>();

	registerTool(name: string, ...rest: unknown[]): void {
		const args = [...rest];
		const handler = args.pop();
		if (typeof handler === "function") {
			this.tools.set(name, handler as ToolHandler);
		}
		const config = args[0];
		if (config && typeof config === "object") {
			this.configs.set(name, config as { description?: string });
		}
	}

	getTool(name: string): ToolHandler {
		const tool = this.tools.get(name);
		if (!tool) throw new Error(`Tool ${name} not registered`);
		return tool;
	}

	getDescription(name: string): string {
		const config = this.configs.get(name);
		if (!config) throw new Error(`Tool ${name} not registered`);
		return config.description ?? "";
	}
}

const logger: ILogger = { sendLog: () => {} };

/**
 * Drive GET_TD_NODE_ERRORS end to end over a client that returns `report`.
 */
async function runTool(
	report: TdNodeErrorReport,
	params: Record<string, unknown> = {},
): Promise<string> {
	const client = {
		getAdditionalToolResultContents: () => null,
		getNodeErrors: async (_params: unknown) => ({
			data: report,
			success: true,
		}),
	} as unknown as TouchDesignerClient;

	const server = new MockMcpServer();
	registerTools(server as unknown as McpServer, logger, client);

	const result = await server.getTool(TOOL_NAMES.GET_TD_NODE_ERRORS)({
		nodePath: report.nodePath,
		responseFormat: "markdown",
		...params,
	});

	return result.content?.find((c) => c.type === "text")?.text ?? "";
}

describe("GET_TD_NODE_ERRORS", () => {
	// Shapes taken from TouchDesigner 099.2025.33230 against a scene of
	// deliberately broken operators.
	const warningOnly: TdNodeErrorReport = {
		errorCount: 0,
		errors: [],
		hasErrors: false,
		hasWarnings: true,
		nodeName: "probe",
		nodePath: "/project1/probe",
		opType: "baseCOMP",
		warningCount: 2,
		warnings: [
			{
				level: "warning",
				message: "Failed to open file.",
				nodeName: "missing_movie",
				nodePath: "/project1/probe/missing_movie",
				opType: "moviefileinTOP",
			},
			{
				level: "warning",
				message:
					'Invalid path for node "/project1/does_not_exist" referenced by parameter "TOP"',
				nodeName: "bad_select",
				nodePath: "/project1/probe/bad_select",
				opType: "selectTOP",
			},
		],
	};

	const mixed: TdNodeErrorReport = {
		errorCount: 1,
		errors: [
			{
				level: "error",
				message:
					"AttributeError: 'NoneType' object has no attribute 'par'\n" +
					", line 1, in <module>\n" +
					"Context:(Parameter: Resolution)",
				nodeName: "bad_res",
				nodePath: "/project1/probe/bad_res",
				opType: "constantTOP",
			},
		],
		hasErrors: true,
		hasWarnings: true,
		nodeName: "probe",
		nodePath: "/project1/probe",
		opType: "baseCOMP",
		warningCount: 1,
		warnings: [
			{
				level: "warning",
				message: "The GLSL Shader has compile errors",
				nodeName: "bad_glsl",
				nodePath: "/project1/probe/bad_glsl",
				opType: "glslTOP",
			},
		],
	};

	it("surfaces warnings even when no errors were reported", async () => {
		// TouchDesigner reports missing files and dangling operator references
		// as warnings, so hasErrors=false must not be treated as a clean node.
		const text = await runTool(warningOnly);

		expect(text).toContain("Failed to open file.");
		expect(text).toContain("Invalid path for node");
		expect(text).not.toContain("No errors or warnings reported");
	});

	it("reports error and warning counts separately", async () => {
		const text = await runTool(mixed);

		expect(text).toContain("Errors: 1");
		expect(text).toContain("Warnings: 1");
	});

	it("attributes each entry to the operator that failed", async () => {
		const text = await runTool(mixed);

		expect(text).toContain("/project1/probe/bad_res");
		expect(text).toContain("/project1/probe/bad_glsl");
	});

	it("keeps a multi-line traceback on one row", async () => {
		const text = await runTool(mixed);

		expect(text).toContain(
			"AttributeError: 'NoneType' object has no attribute 'par' ⏎ , line 1, in <module> ⏎ Context:(Parameter: Resolution)",
		);
	});

	it("lists errors ahead of warnings", async () => {
		const text = await runTool(mixed);

		expect(text.indexOf("AttributeError")).toBeLessThan(
			text.indexOf("GLSL Shader"),
		);
	});

	it("escapes a pipe so it cannot open a new table column", async () => {
		// Shader diagnostics and quoted Python expressions both carry pipes.
		const text = await runTool({
			...mixed,
			errorCount: 1,
			errors: [
				{
					level: "error",
					message: "SyntaxError: invalid syntax: a | b | c",
					nodeName: "bad_expr",
					nodePath: "/project1/probe/bad_expr",
					opType: "constantCHOP",
				},
			],
			hasWarnings: false,
			warningCount: 0,
		});

		const row = text
			.split("\n")
			.find((line) => line.includes("SyntaxError")) as string;
		expect(row).toContain("a \\| b \\| c");
		// Level, node, type, message plus the leading and trailing delimiter.
		expect(row.split(/(?<!\\)\|/).length).toBe(6);
	});

	it("does not claim a stream failed when only an attribution is ambiguous", async () => {
		// The seam a bug lived in: the payload said incomplete false, the
		// markdown said a stream could not be read. Rendering is what the
		// agent reads, so it is what has to be asserted.
		const text = await runTool({
			...mixed,
			incomplete: false,
			skippedStreams: [],
			unresolvedAnchors: [{ path: "/project1/probe/gone", stream: "errors" }],
		});

		expect(text).not.toContain("could not be read");
		expect(text).not.toContain("Incomplete");
		expect(text).toContain("attributions are ambiguous");
	});

	it("says a type is undetermined rather than absent when a lookup failed", async () => {
		const text = await runTool({
			...mixed,
			lookupFailures: [{ path: "/project1/probe/a", stream: "errors" }],
		});

		expect(text).toContain("could not be looked up");
		expect(text).toContain("/project1/probe/a");
		expect(text).not.toContain("Incomplete");
	});

	it("says an owner fell back rather than calling it a folded failure", async () => {
		const text = await runTool({
			...mixed,
			fallbackAttributions: [
				{ path: "/project1/probe/adder", stream: "errors" },
			],
		});

		expect(text).toContain("fell back");
		expect(text).toContain("/project1/probe/adder");
		expect(text).not.toContain("attributions are ambiguous");
		expect(text).not.toContain("Incomplete");
	});

	it("keeps each notice in its own blockquote", async () => {
		// The rendered breaks have to fall where the meanings differ, or the
		// separation between "counts have no ceiling" and "counts are exact,
		// attribution is not" is lost the moment Markdown renders it.
		const text = await runTool({
			...mixed,
			fallbackAttributions: [
				{ path: "/project1/probe/adder", stream: "errors" },
			],
			incomplete: true,
			skippedStreams: [{ reason: "cook in progress", stream: "warnings" }],
			unresolvedAnchors: [{ path: "/project1/probe/gone", stream: "errors" }],
		});

		const quoteBlocks = text
			.split("\n\n")
			.filter((block) => block.trimStart().startsWith(">"));

		expect(quoteBlocks).toHaveLength(3);
		expect(quoteBlocks[0]).toContain("Incomplete");
		expect(quoteBlocks[1]).toContain("attributions are ambiguous");
		expect(quoteBlocks[2]).toContain("fell back");
	});

	it("caps every caveat list, not just the first", async () => {
		// The helper is shared, but each list passes through its own call, so
		// one of them could lose the cap without the others noticing.
		const many = (prefix: string) =>
			Array.from({ length: 12 }, (_, i) => ({
				path: `/project1/probe/${prefix}${i}`,
				stream: "errors",
			}));

		const text = await runTool(
			{
				...mixed,
				fallbackAttributions: many("fb"),
				lookupFailures: many("lf"),
				unresolvedAnchors: many("ua"),
			},
			{ limit: 2 },
		);

		for (const prefix of ["ua", "fb", "lf"]) {
			const bullets = text
				.split("\n")
				.filter((line) => line.startsWith(`> - \`/project1/probe/${prefix}`));
			expect(bullets, prefix).toHaveLength(2);
		}
		expect(text.match(/and 10 more/g)).toHaveLength(3);
	});

	it("caps the caveat lists with the same limit as the rows", async () => {
		// limit is the only control a caller has over response size. Capping
		// the rows while leaving the notes about them unbounded answers a
		// request for a few entries with a footnote longer than the content.
		const many = Array.from({ length: 40 }, (_, i) => ({
			path: `/project1/probe/gone${i}`,
			stream: "errors",
		}));

		const text = await runTool(
			{ ...mixed, unresolvedAnchors: many },
			{ limit: 3 },
		);

		const bullets = text
			.split("\n")
			.filter((line) => line.startsWith("> - `/project1/probe/gone"));

		expect(bullets).toHaveLength(3);
		expect(text).toContain("and 37 more");
	});

	it("flags a disagreement on the error count alone", async () => {
		// mixed lists one error and one warning. Only the error side is wrong
		// here, so a test that skews both would pass even with this half of
		// the check removed.
		const text = await runTool({ ...mixed, errorCount: 5, warningCount: 1 });

		expect(text).toContain("do not match");
	});

	it("flags a disagreement on the warning count alone", async () => {
		const text = await runTool({ ...mixed, errorCount: 1, warningCount: 9 });

		expect(text).toContain("do not match");
	});

	it("says nothing when the counts and the rows agree", async () => {
		const text = await runTool({ ...mixed, errorCount: 1, warningCount: 1 });

		expect(text).not.toContain("do not match");
	});

	it("flags a hasErrors flag that contradicts the rows it arrived with", async () => {
		// Both counts agree with the rows, so only the boolean is wrong. The
		// flag and the count are computed separately on the server, so one can
		// be stale without the other — and hasErrors is the field a caller is
		// most likely to branch on, which would call this node clean with an
		// error sitting in the table below.
		const text = await runTool({
			...mixed,
			errorCount: 1,
			hasErrors: false,
			warningCount: 1,
		});

		expect(text).toContain("do not match");
	});

	it("flags a hasWarnings flag that contradicts the rows it arrived with", async () => {
		const text = await runTool({
			...mixed,
			errorCount: 1,
			hasWarnings: false,
			warningCount: 1,
		});

		expect(text).toContain("do not match");
	});

	it("does not report zero warnings for a component that never looked", async () => {
		// An older TouchDesigner component sends neither warningCount nor
		// hasWarnings. Rendering that as 0 claims the stream was inspected.
		const legacy = {
			errorCount: 1,
			errors: [
				{
					message: "Not enough sources specified",
					nodeName: "displace1",
					nodePath: "/project1/probe/displace1",
					opType: "displaceTOP",
				},
			],
			hasErrors: true,
			nodeName: "probe",
			nodePath: "/project1/probe",
			opType: "baseCOMP",
		};

		const text = await runTool(legacy as never);

		expect(text).not.toContain("Warnings: 0");
		expect(text).toContain("Warnings were not inspected");
		expect(text).toContain("Not enough sources specified");
		// The absent count must not read as a disagreement either.
		expect(text).not.toContain("do not match");
	});

	it("withholds the clean verdict when warnings were never inspected", async () => {
		const text = await runTool({
			errorCount: 0,
			errors: [],
			hasErrors: false,
			nodeName: "probe",
			nodePath: "/project1/probe",
			opType: "baseCOMP",
		} as never);

		expect(text).toContain("Warnings were not inspected");
		expect(text).not.toContain("No errors or warnings reported");
		// The same component cannot report a stream it failed to read, so the
		// absence of that notice is unknown rather than an assurance.
		expect(text).toContain("message stream could not be read");
	});

	it("withholds the clean verdict when a stream could not be read", async () => {
		const text = await runTool({
			...warningOnly,
			errors: [],
			hasWarnings: false,
			incomplete: true,
			skippedStreams: [{ reason: "cook in progress", stream: "errors" }],
			warningCount: 0,
			warnings: [],
		});

		expect(text).toContain("Incomplete");
		expect(text).not.toContain("No errors or warnings reported");
	});

	it("levels an entry by the array it arrived in, not by its own field", async () => {
		// `level` is optional on the wire. Reading it instead of the array
		// membership would render a warning that omitted the field as an
		// error — losing the distinction the two arrays exist to carry.
		const text = await runTool({
			errorCount: 0,
			errors: [],
			hasErrors: false,
			hasWarnings: true,
			nodeName: "probe",
			nodePath: "/project1/probe",
			opType: "baseCOMP",
			warningCount: 1,
			warnings: [
				{
					message: "Failed to open file.",
					nodeName: "missing_movie",
					nodePath: "/project1/probe/missing_movie",
					opType: "moviefileinTOP",
				},
			],
		} as never);

		expect(text).toContain("| warning |");
		expect(text).not.toContain("| error |");
		expect(text).toContain("Errors: 0");
		expect(text).not.toContain("do not match");
	});

	it("tells a missing count apart from a component that never looked", async () => {
		// Both leave warningCount undefined and both withhold the all-clear,
		// but only one of them predates warning collection. Saying so about a
		// payload that states it has warnings is a confident wrong answer.
		const countMissing = await runTool({
			errorCount: 0,
			errors: [],
			hasErrors: false,
			hasWarnings: true,
			nodeName: "probe",
			nodePath: "/project1/probe",
			opType: "baseCOMP",
		} as never);

		expect(countMissing).toContain("warning count was not reported");
		expect(countMissing).not.toContain("Warnings were not inspected");

		const neverLooked = await runTool({
			errorCount: 0,
			errors: [],
			hasErrors: false,
			nodeName: "probe",
			nodePath: "/project1/probe",
			opType: "baseCOMP",
		} as never);

		expect(neverLooked).toContain("Warnings were not inspected");
		expect(neverLooked).not.toContain("warning count was not reported");
	});

	it("does not say the node has warnings when the payload said it has none", async () => {
		// `warningCountMissing` tests presence, so `hasWarnings: false` with
		// no count selects the same banner as `true`. The banner therefore has
		// to be true in both directions — the previous wording said "this
		// component says the node has warnings", which is the opposite of what
		// this payload says, and pointed at "the number below" when the count
		// renders as "not reported".
		const saysNoneButGaveNoCount = await runTool({
			errorCount: 0,
			errors: [],
			hasErrors: false,
			hasWarnings: false,
			nodeName: "probe",
			nodePath: "/project1/probe",
			opType: "baseCOMP",
		} as never);

		expect(saysNoneButGaveNoCount).toContain("warning count was not reported");
		expect(saysNoneButGaveNoCount).not.toContain("the node has warnings");
		expect(saysNoneButGaveNoCount).not.toContain("the number below");
		// Still no all-clear: an unreported count is not a count of zero.
		expect(saysNoneButGaveNoCount).not.toContain(
			"No errors or warnings reported",
		);
	});

	it("trusts skippedStreams even when incomplete is absent", async () => {
		// The formatter ORs the two because a server can send one without the
		// other — which is the whole compatibility story. Every other test
		// sets both, so the disjunct was never exercised on its own.
		const text = await runTool({
			...warningOnly,
			errors: [],
			hasWarnings: false,
			skippedStreams: [{ reason: "cook in progress", stream: "warnings" }],
			warningCount: 0,
			warnings: [],
		});

		expect(text).toContain("Incomplete");
		expect(text).toContain("cook in progress");
		expect(text).not.toContain("No errors or warnings reported");
	});

	it("reports a node with neither errors nor warnings as clean", async () => {
		const text = await runTool({
			...warningOnly,
			errors: [],
			hasWarnings: false,
			warningCount: 0,
			warnings: [],
		});

		expect(text).toContain("No errors or warnings reported");
	});

	it("does not call a node clean when a stream could not be read", async () => {
		// An older TD build without OP.warnings, or a stream that raised. The
		// report must not read as an all-clear on a project never fully seen.
		const text = await runTool({
			...warningOnly,
			errors: [],
			hasWarnings: false,
			incomplete: true,
			skippedStreams: [
				{ reason: "OP.warnings is not available", stream: "warnings" },
			],
			warningCount: 0,
			warnings: [],
		});

		expect(text).toContain("Incomplete");
		expect(text).toContain("no ceiling");
		expect(text).toContain("OP.warnings is not available");
		expect(text).not.toContain("attributions are ambiguous");
	});

	it("flags an ambiguous attribution without calling the report incomplete", async () => {
		// An operator deleted since the message was recorded looks exactly like
		// a file path quoted in a traceback, so its lines stay with the entry
		// above. Both streams were read, though, so the counts still have a
		// ceiling — a different claim from "a stream went unread".
		const text = await runTool({
			...mixed,
			unresolvedAnchors: [{ path: "/project1/probe/gone", stream: "errors" }],
		});

		expect(text).toContain("attributions are ambiguous");
		expect(text).toContain("/project1/probe/gone");
		expect(text).not.toContain("Incomplete");
	});

	it("renders the counts the server sent, not the row count", async () => {
		const text = await runTool({
			...warningOnly,
			errorCount: 5,
			errors: [],
			hasErrors: true,
			hasWarnings: true,
			warningCount: 2,
			warnings: [],
		});

		expect(text).toContain("Errors: 5");
		expect(text).toContain("Warnings: 2");
		expect(text).toContain("do not match");
		// The list is not the whole truth here, so it cannot be an all-clear.
		expect(text).not.toContain("No errors or warnings reported");
	});

	it("drops the operator type column at minimal detail", async () => {
		const full = await runTool(mixed);
		const minimal = await runTool(mixed, { detailLevel: "minimal" });

		expect(full).toContain("constantTOP");
		expect(minimal).not.toContain("constantTOP");
		expect(minimal).toContain("AttributeError");
	});
});

/**
 * The contract the model reads, as opposed to the payload it reads.
 *
 * A Script OP whose callback raises leaves the report in exactly the shape of
 * a clean node — errorCount 0, hasErrors false, incomplete false, no skipped
 * streams — because the exception is on neither of the two streams the report
 * is built from. Nothing in the payload can say so, so the three agent-facing
 * strings have to, and each reaches the model by its own route: only
 * `description` is sent with `tools/list`, while `returns` and `example` come
 * through `describe_td_tools`. Each is asserted separately, so a caveat lost
 * from one field cannot be masked by another field still carrying its own.
 */
describe("GET_TD_NODE_ERRORS contract: Script OP cook exceptions", () => {
	function registerOn(): MockMcpServer {
		// Neither assertion below reaches TouchDesigner: the contract is built
		// from TOOL_DEFINITIONS at registration time, and describe_td_tools
		// never touches the client.
		const client = {
			getAdditionalToolResultContents: () => null,
		} as unknown as TouchDesignerClient;
		const server = new MockMcpServer();
		registerTools(server as unknown as McpServer, logger, client);
		return server;
	}

	async function describeNodeErrorsTool(): Promise<string> {
		const server = registerOn();
		// No detailLevel: a filtered call defaults to "summary", which is the
		// route a model actually takes to this text.
		const result = await server.getTool(TOOL_NAMES.DESCRIBE_TD_TOOLS)({
			filter: "getTdNodeErrors",
			responseFormat: "markdown",
		});
		return result.content?.find((c) => c.type === "text")?.text ?? "";
	}

	it("says so in the description tools/list sends", () => {
		const description = registerOn().getDescription(
			TOOL_NAMES.GET_TD_NODE_ERRORS,
		);

		expect(description).toContain("Script OP callback");
		expect(description).toContain(
			"an empty report is not evidence the node cooked",
		);
	});

	it("says so in the returns describe_td_tools renders", async () => {
		const text = await describeNodeErrorsTool();

		expect(text).toContain("Returns:");
		expect(text).toContain("leaves errorCount 0 with incomplete false");
	});

	it("says so in the example, with the way to make one visible", () => {
		// Asserted on the definition rather than on rendered output, because
		// `example` currently reaches no output at all: it is rendered only by
		// formatToolMetadata's `formatDetailed`, whose text the detailedPayload
		// template discards, and it is absent from the `structured` payload
		// every other format serializes. That is a separate defect; the field
		// is still the contract's source of truth and is pinned here so the
		// caveat cannot be dropped from it silently.
		const definition = TOOL_DEFINITIONS.find(
			(entry) => entry.name === TOOL_NAMES.GET_TD_NODE_ERRORS,
		);

		expect(definition?.example).toContain(
			"Out of scope: a Script OP whose callback raised",
		);
		expect(definition?.example).toContain("call scriptOp.addError(msg)");
	});
});

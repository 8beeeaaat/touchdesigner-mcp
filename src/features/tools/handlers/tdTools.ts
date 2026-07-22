import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAMES } from "../../../core/constants.js";
import { handleToolError } from "../../../core/errorHandling.js";
import { createTdProject } from "../../../core/lifecycle.js";
import type { ILogger } from "../../../core/logger.js";
import { runWithTarget } from "../../../core/targetContext.js";
import { withTargetQueue } from "../../../core/targetQueue.js";
import {
	getTargetRegistry,
	type TargetRegistry,
} from "../../../core/targetRegistry.js";
import {
	probeIdentity,
	startTdProject,
	stopTdProject,
} from "../../../lifecycle/tdProcess.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";
import { getToeDigest } from "../../../toe/digest.js";
import { injectTdMcp } from "../../../toe/injectMcp.js";
import { getToeNode } from "../../../toe/nodeInspect.js";
import {
	createProjectSchema,
	selectTargetSchema,
	startProjectSchema,
	stopProjectSchema,
} from "../lifecycleToolDefinitions.js";
import {
	buildRegisteredToolMetadata,
	type ToolMetadata,
} from "../metadata/touchDesignerToolMetadata.js";
import { formatToolMetadata } from "../presenter/index.js";
import {
	getToeDigestSchema,
	getToeNodeSchema,
	injectTdMcpSchema,
} from "../toeToolDefinitions.js";
import { TOOL_DEFINITIONS, type ToolRunResult } from "../toolDefinitions.js";
import { detailOnlyFormattingSchema } from "../types.js";

const describeToolsSchema = detailOnlyFormattingSchema.extend({
	filter: z
		.string()
		.min(1)
		.describe(
			"Optional keyword to filter by tool name, module path, or parameter description",
		)
		.optional(),
});
type DescribeToolsParams = z.input<typeof describeToolsSchema>;

export function registerTdTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
	registry: TargetRegistry = getTargetRegistry(),
): void {
	for (const definition of TOOL_DEFINITIONS) {
		server.tool(
			definition.name,
			definition.description,
			definition.schema.strict().shape,
			async (params: Record<string, unknown> = {}) => {
				try {
					const selected = registry.getSelected();
					const output = await runWithTarget(registry.asOrigin(selected), () =>
						withTargetQueue(selected.id, () =>
							definition.run({ logger, params, tdClient }),
						),
					);
					return createToolResult(tdClient, output);
				} catch (error) {
					return handleToolError(
						error,
						logger,
						definition.name,
						definition.errorComment,
					);
				}
			},
		);
	}

	server.tool(
		TOOL_NAMES.LIST_TD_TARGETS,
		"List known TouchDesigner targets (lab + MCP-owned). Does not probe liveness.",
		z.object({}).strict().shape,
		async () => {
			try {
				const selectedId = registry.getSelectedId();
				const targets = registry.list().map((t) => ({
					...t,
					selected: t.id === selectedId,
				}));
				return textResult(JSON.stringify({ selectedId, targets }, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.LIST_TD_TARGETS);
			}
		},
	);

	server.tool(
		TOOL_NAMES.SELECT_TD_TARGET,
		"Select the sticky TouchDesigner target for subsequent tools. Probes identity.",
		selectTargetSchema.strict().shape,
		async (params: z.input<typeof selectTargetSchema>) => {
			try {
				const selected = registry.select(params.id);
				const identity = await probeIdentity(
					tdClient,
					selected.id,
					selected.host,
					selected.port,
				);
				return textResult(JSON.stringify({ identity, selected }, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.SELECT_TD_TARGET);
			}
		},
	);

	server.tool(
		TOOL_NAMES.CREATE_TD_PROJECT,
		"Copy the MCP-ready project template to destDir and assign a port. Does not start TouchDesigner.",
		createProjectSchema.strict().shape,
		async (params: z.input<typeof createProjectSchema>) => {
			try {
				const created = await createTdProject(params);
				registry.upsertOwned({
					host: created.target.host,
					id: created.target.id,
					label: created.target.label,
					port: created.target.port,
					projectDir: created.target.projectDir,
					toePath: created.target.toePath,
				});
				return textResult(JSON.stringify(created, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.CREATE_TD_PROJECT);
			}
		},
	);

	server.tool(
		TOOL_NAMES.START_TD_PROJECT,
		"Spawn TouchDesigner on a .toe that has .tdmcp/state.json, wait for the bridge, select the target.",
		startProjectSchema.strict().shape,
		async (params: z.input<typeof startProjectSchema>) => {
			try {
				const result = await startTdProject({
					registry,
					tdClient,
					tdExe: params.tdExe,
					timeoutMs: params.timeoutMs,
					toePath: params.toePath,
				});
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.START_TD_PROJECT);
			}
		},
	);

	server.tool(
		TOOL_NAMES.STOP_TD_PROJECT,
		"Soft-quit then kill an MCP-owned TouchDesigner instance. Refuses builtin lab.",
		stopProjectSchema.strict().shape,
		async (params: z.input<typeof stopProjectSchema>) => {
			try {
				const result = await stopTdProject({
					registry,
					targetId: params.targetId,
					tdClient,
				});
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.STOP_TD_PROJECT);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TOE_DIGEST,
		"[alpha] Offline ToeDigest via toeexpand (cached). Modes: stats, outline (default), nodes, wires, refs. Token-capped; expand-relative paths. API may change.",
		getToeDigestSchema.strict().shape,
		async (params: z.input<typeof getToeDigestSchema>) => {
			try {
				const result = await getToeDigest(params);
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.GET_TOE_DIGEST);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TOE_NODE,
		"[alpha] Deep offline inspect of one expand-relative node/COMP (inputs, outputs, parms, text). API may change.",
		getToeNodeSchema.strict().shape,
		async (params: z.input<typeof getToeNodeSchema>) => {
			try {
				const result = await getToeNode(params);
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.GET_TOE_NODE);
			}
		},
	);

	server.tool(
		TOOL_NAMES.INJECT_TD_MCP,
		"[alpha] Offline: graft MCP onStart + modules/tdmcp_bridge.tox (runtime loadTox) into a foreign .toe in an empty destDir; write .tdmcp/state.json. Does not start TD. Then call start_td_project.",
		injectTdMcpSchema.strict().shape,
		async (params: z.input<typeof injectTdMcpSchema>) => {
			try {
				const result = await injectTdMcp(params);
				registry.upsertOwned({
					host: result.target.host,
					id: result.target.id,
					label: result.target.label,
					port: result.target.port,
					projectDir: result.target.projectDir,
					toePath: result.target.toePath,
				});
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				if (error instanceof Error && "code" in error) {
					const e = error as Error & {
						code: string;
						conflict?: unknown;
					};
					const payload = {
						conflict: e.conflict ?? null,
						error: e.code,
						message: e.message,
					};
					return {
						content: [
							{
								text: JSON.stringify(payload, null, 2),
								type: "text" as const,
							},
						],
						isError: true,
					};
				}
				return handleToolError(error, logger, TOOL_NAMES.INJECT_TD_MCP);
			}
		},
	);

	const toolMetadataEntries = buildRegisteredToolMetadata();
	server.tool(
		TOOL_NAMES.DESCRIBE_TD_TOOLS,
		"Generate a filesystem-oriented manifest of available TouchDesigner tools",
		describeToolsSchema.strict().shape,
		async (params: DescribeToolsParams = {}) => {
			try {
				const { detailLevel, responseFormat, filter } = params;
				const normalizedFilter = filter?.trim().toLowerCase();
				const filteredEntries = normalizedFilter
					? toolMetadataEntries.filter((entry) =>
							matchesMetadataFilter(entry, normalizedFilter),
						)
					: toolMetadataEntries;

				if (filteredEntries.length === 0) {
					const message = filter
						? `No TouchDesigner tools matched filter "${filter}".`
						: "No TouchDesigner tools are registered.";
					return {
						content: [{ text: message, type: "text" as const }],
					};
				}

				const formattedText = formatToolMetadata(filteredEntries, {
					detailLevel: detailLevel ?? (filter ? "summary" : "minimal"),
					filter: normalizedFilter,
					responseFormat,
				});

				return {
					content: [{ text: formattedText, type: "text" as const }],
				};
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.DESCRIBE_TD_TOOLS);
			}
		},
	);
}

function textResult(text: string): z.infer<typeof CallToolResultSchema> {
	return { content: [{ text, type: "text" as const }] };
}

const createToolResult = (
	tdClient: TouchDesignerClient,
	output: ToolRunResult,
): z.infer<typeof CallToolResultSchema> => {
	const content: z.infer<typeof CallToolResultSchema>["content"] =
		typeof output === "string"
			? [{ text: output, type: "text" as const }]
			: output.content.map((block) =>
					block.type === "image"
						? {
								data: block.data,
								mimeType: block.mimeType,
								type: "image" as const,
							}
						: { text: block.text, type: "text" as const },
				);
	const additionalContents = tdClient.getAdditionalToolResultContents();
	if (additionalContents) {
		content.push(...additionalContents);
	}
	return { content };
};

function matchesMetadataFilter(entry: ToolMetadata, keyword: string): boolean {
	const normalizedKeyword = keyword.toLowerCase();
	if (entry.tool.toLowerCase().includes(normalizedKeyword)) return true;
	if (entry.description.toLowerCase().includes(normalizedKeyword)) return true;
	if (entry.category.toLowerCase().includes(normalizedKeyword)) return true;
	if (entry.functionName.toLowerCase().includes(normalizedKeyword)) return true;
	return entry.parameters.some(
		(p) =>
			p.name.toLowerCase().includes(normalizedKeyword) ||
			(p.description?.toLowerCase().includes(normalizedKeyword) ?? false),
	);
}

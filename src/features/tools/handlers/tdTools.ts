import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAMES } from "../../../core/constants.js";
import { handleToolError } from "../../../core/errorHandling.js";
import { createTdProject } from "../../../core/lifecycle.js";
import type { ILogger } from "../../../core/logger.js";
import { runWithTarget } from "../../../core/targetContext.js";
import {
	getTargetRegistry,
	type TargetRegistry,
} from "../../../core/targetRegistry.js";
import { withTargetQueue } from "../../../core/targetQueue.js";
import {
	probeIdentity,
	startTdProject,
	stopTdProject,
} from "../../../lifecycle/tdProcess.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";
import {
	buildToolMetadata,
	type ToolMetadata,
} from "../metadata/touchDesignerToolMetadata.js";
import { formatToolMetadata } from "../presenter/index.js";
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

const selectTargetSchema = z.object({
	id: z.string().min(1).describe("Target id from list_td_targets"),
});

const createProjectSchema = z.object({
	destDir: z
		.string()
		.min(1)
		.describe("Absolute path for the new project directory (must be empty/new)"),
	name: z
		.string()
		.min(1)
		.optional()
		.describe("Toe stem name without extension (default: project)"),
	port: z.number().int().min(9984).optional().describe("Optional fixed port"),
});

const startProjectSchema = z.object({
	toePath: z
		.string()
		.min(1)
		.describe("Absolute path to the .toe to open"),
	tdExe: z
		.string()
		.min(1)
		.optional()
		.describe("Optional path to TouchDesigner.exe"),
	timeoutMs: z.number().int().min(1000).optional(),
});

const stopProjectSchema = z.object({
	targetId: z
		.string()
		.min(1)
		.describe("Owned target id (never lab)"),
});

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
					const output = await runWithTarget(
						registry.asOrigin(selected),
						() =>
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
				return textResult(
					JSON.stringify({ selected, identity }, null, 2),
				);
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

	const toolMetadataEntries = buildToolMetadata(TOOL_DEFINITIONS);
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

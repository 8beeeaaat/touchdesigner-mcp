import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAMES } from "../../../core/constants.js";
import { handleToolError } from "../../../core/errorHandling.js";
import type { ILogger } from "../../../core/logger.js";
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

export function registerTdTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
): void {
	// Register every TouchDesigner operation from the single source of truth.
	for (const definition of TOOL_DEFINITIONS) {
		server.tool(
			definition.name,
			definition.description,
			definition.schema.strict().shape,
			async (params: Record<string, unknown> = {}) => {
				try {
					const output = await definition.run({ logger, params, tdClient });
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

	// `describe_td_tools` is the meta tool: it documents the tools above rather
	// than calling TouchDesigner, so it is registered on its own.
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
	const haystacks = [
		entry.functionName,
		entry.modulePath,
		entry.description,
		entry.category,
		entry.tool,
		entry.notes ?? "",
	];

	if (
		haystacks.some((value) => value.toLowerCase().includes(normalizedKeyword))
	) {
		return true;
	}

	return entry.parameters.some((param) =>
		[param.name, param.type, param.description ?? ""].some((value) =>
			value.toLowerCase().includes(normalizedKeyword),
		),
	);
}

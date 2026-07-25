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
	dismissAllTdUiDialogs,
	dismissTdUiDialog,
	inspectTdUi,
} from "../../../lifecycle/tdDialogs.js";
import {
	probeIdentity,
	resolveTargetPid,
	startTdProject,
	stopTdProject,
} from "../../../lifecycle/tdProcess.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";
import { getToeDigest } from "../../../toe/digest.js";
import { injectTdMcp } from "../../../toe/injectMcp.js";
import { getToeNode } from "../../../toe/nodeInspect.js";
import {
	createProjectSchema,
	LIFECYCLE_TOOL_DEFINITIONS,
	selectTargetSchema,
	startProjectSchema,
	stopProjectSchema,
	tdUiDialogsSchema,
} from "../lifecycleToolDefinitions.js";
import {
	buildRegisteredToolMetadata,
	type ToolMetadata,
} from "../metadata/touchDesignerToolMetadata.js";
import { formatToolMetadata } from "../presenter/index.js";
import { slimShapeForMcp, slimToeShapeForMcp } from "../slimSchemaForMcp.js";
import {
	getToeDigestSchema,
	getToeNodeSchema,
	injectTdMcpSchema,
	TOE_TOOL_DEFINITIONS,
} from "../toeToolDefinitions.js";
import { TOOL_DEFINITIONS, type ToolRunResult } from "../toolDefinitions.js";
import { detailOnlyFormattingSchema } from "../types.js";

const describeToolsSchema = detailOnlyFormattingSchema.extend({
	filter: z.string().min(1).optional(),
});

function lifecycleDescription(name: string): string {
	const entry = LIFECYCLE_TOOL_DEFINITIONS.find((d) => d.name === name);
	if (!entry) {
		throw new Error(`missing lifecycle tool metadata for ${name}`);
	}
	return entry.description;
}

function toeDescription(name: string): string {
	const entry = TOE_TOOL_DEFINITIONS.find((d) => d.name === name);
	if (!entry) {
		throw new Error(`missing toe tool metadata for ${name}`);
	}
	return entry.description;
}

export function registerTdTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
	registry: TargetRegistry = getTargetRegistry(),
): void {
	for (const definition of TOOL_DEFINITIONS) {
		const fullSchema = definition.schema;
		server.tool(
			definition.name,
			definition.description,
			slimShapeForMcp(fullSchema),
			async (params: Record<string, unknown> = {}) => {
				try {
					const parsed = fullSchema.parse(params) as Record<string, unknown>;
					if (registry.hasHub()) {
						await registry.syncFromHub();
					}
					const selected = registry.getSelected();
					const output = await runWithTarget(registry.asOrigin(selected), () =>
						withTargetQueue(selected.id, () =>
							definition.run({ logger, params: parsed, tdClient }),
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
		lifecycleDescription(TOOL_NAMES.LIST_TD_TARGETS),
		slimShapeForMcp(z.object({}).strict()),
		async () => {
			try {
				if (registry.hasHub()) {
					await registry.syncFromHub();
				}
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
		lifecycleDescription(TOOL_NAMES.SELECT_TD_TARGET),
		slimShapeForMcp(selectTargetSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const parsed = selectTargetSchema.parse(params);
				const selected = await registry.selectAsync(parsed.id);
				const identity = await probeIdentity(
					tdClient,
					registry.asOrigin(selected),
				);
				return textResult(JSON.stringify({ identity, selected }, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.SELECT_TD_TARGET);
			}
		},
	);

	server.tool(
		TOOL_NAMES.CREATE_TD_PROJECT,
		lifecycleDescription(TOOL_NAMES.CREATE_TD_PROJECT),
		slimShapeForMcp(createProjectSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const parsed = createProjectSchema.parse(params);
				const created = await createTdProject(parsed);
				await registry.upsertOwnedAsync({
					host: created.target.host,
					hubUrl: created.target.hubUrl,
					id: created.target.id,
					label: created.target.label,
					nonce: created.target.nonce,
					port: created.target.port,
					projectDir: created.target.projectDir,
					toePath: created.target.toePath,
					transport: created.target.transport,
				});
				// Register expect early so a manually-opened toe can connect
				if (created.transport === "tunnel" && created.nonce) {
					const { getHubClient } = await import("../../../hub/client.js");
					const { ensureHub } = await import("../../../hub/ensureHub.js");
					const hubUrl =
						created.target.hubUrl ||
						process.env.TDMCP_HUB_URL ||
						"http://127.0.0.1:9980";
					await ensureHub({ hubUrl });
					await getHubClient(hubUrl).expectPeer({
						id: created.targetId,
						label: created.target.label,
						nonce: created.nonce,
						projectDir: created.destDir,
						toePath: created.toePath,
					});
				}
				return textResult(JSON.stringify(created, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.CREATE_TD_PROJECT);
			}
		},
	);

	server.tool(
		TOOL_NAMES.START_TD_PROJECT,
		lifecycleDescription(TOOL_NAMES.START_TD_PROJECT),
		slimShapeForMcp(startProjectSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const parsed = startProjectSchema.parse(params);
				const result = await startTdProject({
					registry,
					tdClient,
					tdExe: parsed.tdExe,
					timeoutMs: parsed.timeoutMs,
					toePath: parsed.toePath,
				});
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.START_TD_PROJECT);
			}
		},
	);

	server.tool(
		TOOL_NAMES.STOP_TD_PROJECT,
		lifecycleDescription(TOOL_NAMES.STOP_TD_PROJECT),
		slimShapeForMcp(stopProjectSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const parsed = stopProjectSchema.parse(params);
				const result = await stopTdProject({
					registry,
					targetId: parsed.targetId,
					tdClient,
				});
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.STOP_TD_PROJECT);
			}
		},
	);

	server.tool(
		TOOL_NAMES.TD_UI_DIALOGS,
		lifecycleDescription(TOOL_NAMES.TD_UI_DIALOGS),
		slimShapeForMcp(tdUiDialogsSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const parsed = tdUiDialogsSchema.parse(params);
				if (process.platform !== "win32") {
					return textResult(
						JSON.stringify({
							error: "td_ui_dialogs is Windows-only",
							platform: process.platform,
						}),
					);
				}
				let pid = resolveTargetPid(registry);
				if (!pid) {
					const selected = registry.getSelected();
					try {
						const identity = await probeIdentity(
							tdClient,
							registry.asOrigin(selected),
						);
						pid = resolveTargetPid(registry, Number(identity.osPid));
					} catch {
						// fall through
					}
				}
				if (!pid) {
					throw new Error(
						"td_ui_dialogs: no OS pid for sticky target (start owned project or ensure bridge is up)",
					);
				}
				const listed = await inspectTdUi(pid);
				if (parsed.action === "list") {
					return textResult(
						JSON.stringify(
							{
								dialogs: listed.dialogs,
								inspectTimedOut: listed.inspectTimedOut ?? false,
								mainWindowTitle: listed.mainWindowTitle,
								pid,
								responding: listed.responding,
							},
							null,
							2,
						),
					);
				}
				const targets = parsed.title
					? listed.dialogs.filter((d) => d.title === parsed.title)
					: listed.dialogs;
				const toDismiss =
					parsed.title && targets.length === 0
						? [
								{
									message: "",
									severity: "unknown" as const,
									title: parsed.title,
								},
							]
						: targets;
				const { attempted, dismissed } = parsed.title
					? {
							attempted: toDismiss,
							dismissed: (await dismissTdUiDialog(parsed.title)).dismissed
								? toDismiss
								: [],
						}
					: await dismissAllTdUiDialogs(toDismiss);
				const still = await inspectTdUi(pid);
				return textResult(
					JSON.stringify(
						{
							attempted,
							dismissed,
							pid,
							responding: still.responding,
							stillOpen: still.dialogs,
						},
						null,
						2,
					),
				);
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.TD_UI_DIALOGS);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TOE_DIGEST,
		toeDescription(TOOL_NAMES.GET_TOE_DIGEST),
		slimToeShapeForMcp(getToeDigestSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const result = await getToeDigest(getToeDigestSchema.parse(params));
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.GET_TOE_DIGEST);
			}
		},
	);

	server.tool(
		TOOL_NAMES.GET_TOE_NODE,
		toeDescription(TOOL_NAMES.GET_TOE_NODE),
		slimToeShapeForMcp(getToeNodeSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const result = await getToeNode(getToeNodeSchema.parse(params));
				return textResult(JSON.stringify(result, null, 2));
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.GET_TOE_NODE);
			}
		},
	);

	server.tool(
		TOOL_NAMES.INJECT_TD_MCP,
		toeDescription(TOOL_NAMES.INJECT_TD_MCP),
		slimToeShapeForMcp(injectTdMcpSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const result = await injectTdMcp(injectTdMcpSchema.parse(params));
				await registry.upsertOwnedAsync({
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
		"Manifest of registered TD MCP tools",
		slimShapeForMcp(describeToolsSchema),
		async (params: Record<string, unknown> = {}) => {
			try {
				const parsed = describeToolsSchema.parse(params);
				const { detailLevel, responseFormat, filter } = parsed;
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

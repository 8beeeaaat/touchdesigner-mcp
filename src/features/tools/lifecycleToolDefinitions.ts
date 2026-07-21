import { z } from "zod";
import { TOOL_NAMES } from "../../core/constants.js";
import type { ToolMetadataSource } from "./toolDefinitions.js";

/** Schemas shared by lifecycle registration and `describe_td_tools`. */
export const selectTargetSchema = z.object({
	id: z.string().min(1).describe("Target id from list_td_targets"),
});

export const createProjectSchema = z.object({
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

export const startProjectSchema = z.object({
	toePath: z.string().min(1).describe("Absolute path to the .toe to open"),
	tdExe: z
		.string()
		.min(1)
		.optional()
		.describe("Optional path to TouchDesigner.exe"),
	timeoutMs: z.number().int().min(1000).optional(),
});

export const stopProjectSchema = z.object({
	targetId: z.string().min(1).describe("Owned target id (never lab)"),
});

export const listTargetsSchema = z.object({}).strict();

/**
 * Target/lifecycle tools registered outside `TOOL_DEFINITIONS` (custom handlers).
 * Included in `describe_td_tools` via `buildRegisteredToolMetadata`.
 */
export const LIFECYCLE_TOOL_DEFINITIONS: readonly ToolMetadataSource[] = [
	{
		category: "system",
		description:
			"List known TouchDesigner targets (lab + MCP-owned). Does not probe liveness.",
		example: "list_td_targets()",
		name: TOOL_NAMES.LIST_TD_TARGETS,
		returns: "JSON: selectedId and targets[] with selected flags",
		schema: listTargetsSchema,
	},
	{
		category: "system",
		description:
			"Select the sticky TouchDesigner target for subsequent tools. Probes identity.",
		example: 'select_td_target({ id: "lab" })',
		name: TOOL_NAMES.SELECT_TD_TARGET,
		returns: "JSON: selected target + identity (projectName, projectFolder, …)",
		schema: selectTargetSchema.strict(),
	},
	{
		category: "system",
		description:
			"Copy the MCP-ready project template to destDir and assign a port. Does not start TouchDesigner.",
		example:
			'create_td_project({ destDir: "C:/tmp/my_td_project", name: "project" })',
		name: TOOL_NAMES.CREATE_TD_PROJECT,
		notes: "Does not select the new target. Ports are ≥9984 (skips 9982/9983).",
		returns: "JSON: created target + paths",
		schema: createProjectSchema.strict(),
	},
	{
		category: "system",
		description:
			"Spawn TouchDesigner on a .toe that has .tdmcp/state.json, wait for the bridge, select the target.",
		example: 'start_td_project({ toePath: "C:/tmp/my_td_project/project.toe" })',
		name: TOOL_NAMES.START_TD_PROJECT,
		returns: "JSON: identity, pid, port; sticky target becomes the owned instance",
		schema: startProjectSchema.strict(),
	},
	{
		category: "system",
		description:
			"Soft-quit then kill an MCP-owned TouchDesigner instance. Refuses builtin lab.",
		example: 'stop_td_project({ targetId: "owned-abcd1234" })',
		name: TOOL_NAMES.STOP_TD_PROJECT,
		notes: "If the stopped target was selected, sticky falls back to lab.",
		returns: "JSON: stop result",
		schema: stopProjectSchema.strict(),
	},
];

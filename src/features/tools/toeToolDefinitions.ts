import { z } from "zod";
import { TOOL_NAMES } from "../../core/constants.js";
import type { ToolMetadataSource } from "./toolDefinitions.js";

export const getToeDigestSchema = z.object({
	maxChars: z
		.number()
		.int()
		.min(200)
		.max(100_000)
		.optional()
		.describe("Hard cap on outline string length (default: 6000)"),
	maxDepth: z
		.number()
		.int()
		.min(0)
		.max(32)
		.optional()
		.describe("Max directory depth from expand root (default: 3)"),
	maxNodes: z
		.number()
		.int()
		.min(1)
		.max(2000)
		.optional()
		.describe("Hard cap on outline/nodes entries (default: 80)"),
	mode: z
		.enum(["stats", "outline", "nodes"])
		.optional()
		.describe('Digest mode (default: "outline")'),
	path: z
		.string()
		.min(1)
		.optional()
		.describe(
			"Expand-relative subtree filter (e.g. project1 or project1/geo1)",
		),
	refresh: z
		.boolean()
		.optional()
		.describe("Bypass expand cache and re-run toeexpand"),
	tdExe: z
		.string()
		.min(1)
		.optional()
		.describe("Optional TouchDesigner.exe path (locates sibling toeexpand)"),
	toePath: z
		.string()
		.min(1)
		.describe("Absolute path to a .toe file (never expands in-place)"),
});

export const TOE_TOOL_DEFINITIONS: readonly ToolMetadataSource[] = [
	{
		category: "system",
		description:
			"[alpha] Offline ToeDigest of a .toe via toeexpand (cached). Modes: stats, outline (default), nodes. Token-capped; paths are expand-relative. API may change.",
		example:
			'get_toe_digest({ toePath: "C:/proj/project.toe", mode: "outline", path: "project1", maxDepth: 2 })',
		name: TOOL_NAMES.GET_TOE_DIGEST,
		notes:
			"Alpha. Does not start TouchDesigner. Never writes beside the source toe. See docs/toe-digest.md.",
		returns: "JSON: ToeDigest (stats | outline | nodes) with warnings[]",
		schema: getToeDigestSchema.strict(),
	},
];

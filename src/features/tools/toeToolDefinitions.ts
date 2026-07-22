import { z } from "zod";
import { TOOL_NAMES } from "../../core/constants.js";
import type { ToolMetadataSource } from "./toolDefinitions.js";

export const getToeDigestSchema = z.object({
	around: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Ego/hub seed for mode "wires" (defaults to path). COMP hubs fall back to children wires when ego is empty.',
		),
	maxChars: z
		.number()
		.int()
		.min(200)
		.max(100_000)
		.optional()
		.describe("Hard cap on text payload length (default: 6000)"),
	maxDepth: z
		.number()
		.int()
		.min(0)
		.max(32)
		.optional()
		.describe(
			"Depth limit (default: 3). With path set: levels *below* that path. Without path: absolute from expand root.",
		),
	maxNodes: z
		.number()
		.int()
		.min(1)
		.max(2000)
		.optional()
		.describe(
			"Hard cap on outline/nodes/wires/refs/files/extensions entries (default: 80)",
		),
	mode: z
		.enum([
			"stats",
			"outline",
			"nodes",
			"wires",
			"refs",
			"files",
			"brief",
			"extensions",
			"validate",
		])
		.optional()
		.describe(
			'Digest mode (default: "outline"). Prefer "brief" for hub investigation; "extensions" lists COMP Python Exts (ext0…), not Preferences packages; "stats" includes extensionsSummary; "validate" runs toe_build checks (sibling name dups, toc dups, tox↔op collisions) and returns detailed errors.',
		),
	path: z
		.string()
		.min(1)
		.optional()
		.describe(
			"Expand-relative subtree or brief hub seed (e.g. project1 or project1/comp_all)",
		),
	radius: z
		.number()
		.int()
		.min(0)
		.max(8)
		.optional()
		.describe("Ego hop radius for brief/wires around (default: 1)"),
	refKind: z
		.enum(["opOnly", "all"])
		.optional()
		.describe('refs filter (default: "opOnly"; use "all" for expr spam)'),
	refresh: z
		.boolean()
		.optional()
		.describe("Bypass expand cache and re-run toeexpand"),
	relativeDepth: z
		.number()
		.int()
		.min(0)
		.max(32)
		.optional()
		.describe(
			"When path is set, overrides maxDepth as levels-below-path. Ignored when path is omitted.",
		),
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

export const getToeNodeSchema = z.object({
	file: z
		.string()
		.min(1)
		.optional()
		.describe(
			"Optional sidecar basename or expand-relative file (e.g. glsl1_compute.text)",
		),
	include: z
		.array(
			z.enum([
				"inputs",
				"outputs",
				"parms",
				"text",
				"meta",
				"files",
				"raw",
				"wires",
				"children",
			]),
		)
		.optional()
		.describe(
			"Sections to include. Overrides profile defaults when set. Alpha.",
		),
	maxChars: z
		.number()
		.int()
		.min(200)
		.max(100_000)
		.optional()
		.describe("Hard cap on text body length (default: 4000)"),
	maxNodes: z
		.number()
		.int()
		.min(1)
		.max(2000)
		.optional()
		.describe("Cap for local wires lines (default: 80)"),
	maxParms: z
		.number()
		.int()
		.min(1)
		.max(500)
		.optional()
		.describe("Hard cap on parm rows (default: 40)"),
	path: z
		.string()
		.min(1)
		.describe(
			"Expand-relative node/COMP path (e.g. project1/chladni3d/blur_low)",
		),
	profile: z
		.enum(["summary", "deep"])
		.optional()
		.describe(
			"summary=inputs+parms (+extension if present); deep=+outputs,files,raw,wires,children,meta (cookOff)",
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

export const injectTdMcpSchema = z.object({
	destDir: z
		.string()
		.min(1)
		.describe(
			"Absolute empty workspace directory (must not exist or must be empty). Never the source toe folder.",
		),
	name: z
		.string()
		.min(1)
		.optional()
		.describe("Output toe stem without extension (default: source basename)"),
	onConflict: z
		.enum(["abort", "skip", "replace"])
		.optional()
		.describe(
			'When bridge stems already exist: abort (default), skip (sidecars+state only), or replace (wipe graft and reinject)',
		),
	port: z
		.number()
		.int()
		.min(9984)
		.optional()
		.describe("Optional fixed owned port (≥9984)"),
	tdExe: z
		.string()
		.min(1)
		.optional()
		.describe("Optional TouchDesigner.exe path (locates toeexpand/toecollapse)"),
	toePath: z
		.string()
		.min(1)
		.describe("Absolute path to the source .toe (copied; never mutated)"),
});

export const TOE_TOOL_DEFINITIONS: readonly ToolMetadataSource[] = [
	{
		category: "system",
		description:
			'[alpha] Offline ToeDigest. Full-project: stats → outline(path,maxDepth=1) → wires(path) → extensions. Hub: mode "brief" then get_toe_node deep. COMP Python Exts via mode "extensions" / stats.extensionsSummary (not Preferences packages).',
		example:
			'get_toe_digest({ toePath: "C:/proj/Gestation.toe", mode: "brief", path: "project1/comp_all", radius: 1 })',
		name: TOOL_NAMES.GET_TOE_DIGEST,
		notes:
			"Alpha. Never writes beside the source toe. maxDepth is relative to path when path is set. See docs/toe-digest.md.",
		returns:
			"JSON: ToeDigest including expand{cacheKey,expandDir,tocPath,cacheHit}",
		schema: getToeDigestSchema.strict(),
	},
	{
		category: "system",
		description:
			'[alpha] Deep offline inspect of one expand-relative node. Prefer profile "deep" (files+raw+wires+children+meta). Always surfaces COMP Python Ext slots when present (extension.slots). Optional file= for sidecar text.',
		example:
			'get_toe_node({ toePath: "C:/proj/Gestation.toe", path: "project1/membrane_frag", profile: "deep" })',
		name: TOOL_NAMES.GET_TOE_NODE,
		notes:
			"Alpha. Reuses toeexpand cache. Paths are expand-relative. Ext = COMP Python Ext (ext0…), not install packages. See docs/toe-digest.md.",
		returns:
			"JSON: ToeNodeResult with expand, children, extension, meta.cookOff, files/raw abs paths, warnings[]",
		schema: getToeNodeSchema.strict(),
	},
	{
		category: "system",
		description:
			"[alpha] Offline: copy a foreign .toe into an empty destDir, graft tdmcp_port_onstart, stage modules/ + modules/tdmcp_bridge.tox (runtime loadTox — no embedded bridge COMP), write .tdmcp/state.json. Then start_td_project. Does not start or select.",
		example:
			'inject_td_mcp({ toePath: "C:/dl/demo.toe", destDir: "C:/tmp/demo_mcp" })',
		name: TOOL_NAMES.INJECT_TD_MCP,
		notes:
			'Alpha. onConflict abort|skip|replace. Never mutates source. Requires project1. See docs/toe-digest.md and AGENT_MCP adopt cookbook.',
		returns:
			'JSON: { destDir, toePath, targetId, port, action, warnings[], conflict? }',
		schema: injectTdMcpSchema.strict(),
	},
];

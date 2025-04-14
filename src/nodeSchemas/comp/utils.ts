import { z } from "zod";

/**
 * Create a complete schema for a COMP node type
 * @param specificParams Object containing specific parameters for this COMP type
 * @returns Zod schema with both common and specific parameters
 */
export function createCOMPSchema<T extends Record<string, z.ZodTypeAny>>(
	specificParams: T,
) {
	return z
		.object({
			...{
				clone: z
					.union([z.string(), z.null()])
					.optional()
					.describe("Clone Master"),
				enablecloning: z.boolean().optional().describe("Enable Cloning"),
				enableexternaltox: z
					.boolean()
					.optional()
					.describe("Enable External TOX"),
				externaltox: z.string().optional().describe("External TOX Path"),
				iop: z.number().optional().describe("Internal op num"),
				iop0shortcut: z.string().optional().describe("Internal op 0 Shortcut"),
				iop0op: z.string().optional().describe("Internal op 0 OP"),
				iop1shortcut: z.string().optional().describe("Internal op 1 Shortcut"),
				iop1op: z.string().optional().describe("Internal op 1 OP"),
				iop2shortcut: z.string().optional().describe("Internal op 2 Shortcut"),
				iop2op: z.string().optional().describe("Internal op 2 OP"),
				loadondemand: z.boolean().optional().describe("Load on Demand"),
				nodeview: z.string().optional().describe("Node View"),
				opshortcut: z.string().optional().describe("Global OP Shortcut"),
				opviewer: z
					.union([z.string(), z.null()])
					.optional()
					.describe("Operator Viewer"),
				parentshortcut: z.string().optional().describe("Parent Shortcut"),
				reloadbuiltin: z
					.boolean()
					.optional()
					.describe("Reload Built-In Parameters"),
				reloadcustom: z
					.boolean()
					.optional()
					.describe("Reload Custom Parameters"),
				relpath: z.string().optional().describe("Relative File Path Behavior"),
				savebackup: z.boolean().optional().describe("Save Backup of External"),
				subcompname: z.string().optional().describe("Sub-Component to Load"),
			},
			...specificParams,
		})
		.strict();
}

import { z } from "zod";

/**
 * Create a complete schema for a CHOP node type
 * @param specificParams Object containing specific parameters for this CHOP type
 * @returns Zod schema with both common and specific parameters
 */
export function createCHOPSchema<T extends Record<string, z.ZodTypeAny>>(
	specificParams: T,
) {
	return z
		.object({
			...{
				pageindex: z.number().optional().describe("Page Index"),
				active: z.boolean().optional().describe("Active"),
				timeslice: z.boolean().optional().describe("Time Slice"),
				scope: z.string().optional().describe("Scope"),
				srselect: z.string().optional().describe("Sample Rate Select"),
				exportmethod: z.string().optional().describe("Export Method"),
				autoexportroot: z.string().optional().describe("Auto Export Root"),
				exporttable: z.any().optional().describe("Export Table"),
			},
			...specificParams,
		})
		.strict();
}

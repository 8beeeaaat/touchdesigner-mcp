import { z } from "zod";

/**
 * Create a complete schema for a TOP node type
 * @param specificParams Object containing specific parameters for this TOP type
 * @returns Zod schema with both common and specific parameters
 */
export function createTOPSchema<T extends Record<string, z.ZodTypeAny>>(
	specificParams: T,
) {
	return z
		.object({
			...{
				aspect1: z.number().optional().describe("Aspect Ratio Width"),
				aspect2: z.number().optional().describe("Aspect Ratio Height"),
				chanmask: z.string().optional().describe("Channel Mask"),
				fillmode: z.string().optional().describe("Fill Viewer"),
				filtertype: z.string().optional().describe("Viewer Smoothness"),
				format: z.string().optional().describe("Pixel Format"),
				inputfiltertype: z.string().optional().describe("Input Smoothness"),
				npasses: z.number().optional().describe("Passes"),
				outputaspect: z.string().optional().describe("Output Aspect"),
				outputresolution: z.string().optional().describe("Output Resolution"),
				resmult: z.boolean().optional().describe("Use Global Res Multiplier"),
				resolutionh: z.number().optional().describe("Resolution Height"),
				resolutionw: z.number().optional().describe("Resolution Width"),
			},
			...specificParams,
		})
		.strict();
}

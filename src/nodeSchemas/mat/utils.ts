import { z } from "zod";

/**
 * Create a complete schema for a MAT node type
 * @param specificParams Object containing specific parameters for this MAT type
 * @returns Zod schema with both common and specific parameters
 */
export function createMATSchema<T extends Record<string, z.ZodTypeAny>>(
	specificParams: T,
) {
	return z
		.object({
			...{
				pageindex: z.number().optional().describe("Page Index"),
				dodeform: z.boolean().optional().describe("Do Deform"),
				deformdata: z.string().optional().describe("Deform Data"),
				targetsop: z.any().nullable().optional().describe("Target SOP"),
				pcaptpath: z.string().optional().describe("PCapt Path"),
				pcaptdata: z.string().optional().describe("PCapt Data"),
				skelrootpath: z.string().optional().describe("Skeleton Root Path"),
				mat: z.any().nullable().optional().describe("Material"),

				blending: z.boolean().optional().describe("Blending"),
				blendop: z.string().optional().describe("Blend Operation"),
				srcblend: z.string().optional().describe("Source Blend"),
				destblend: z.string().optional().describe("Destination Blend"),
				separatealphafunc: z
					.boolean()
					.optional()
					.describe("Separate Alpha Function"),
				blendopa: z.string().optional().describe("Blend Operation Alpha"),
				srcblenda: z.string().optional().describe("Source Blend Alpha"),
				destblenda: z.string().optional().describe("Destination Blend Alpha"),
				blendconstantr: z.number().optional().describe("Blend Constant Red"),
				blendconstantg: z.number().optional().describe("Blend Constant Green"),
				blendconstantb: z.number().optional().describe("Blend Constant Blue"),
				blendconstanta: z.number().optional().describe("Blend Constant Alpha"),
				legacyalphabehavior: z
					.boolean()
					.optional()
					.describe("Legacy Alpha Behavior"),
				postmultalpha: z.boolean().optional().describe("Post Multiply Alpha"),
				pointcolorpremult: z
					.string()
					.optional()
					.describe("Point Color Premultiply"),

				depthtest: z.boolean().optional().describe("Depth Test"),
				depthfunc: z.string().optional().describe("Depth Function"),
				depthwriting: z.boolean().optional().describe("Depth Writing"),
				alphatest: z.boolean().optional().describe("Alpha Test"),
				alphafunc: z.string().optional().describe("Alpha Function"),
				alphathreshold: z.number().optional().describe("Alpha Threshold"),

				wireframe: z.string().optional().describe("Wireframe"),
				wirewidth: z.number().optional().describe("Wire Width"),
				cullface: z.string().optional().describe("Cull Face"),
				polygonoffset: z.boolean().optional().describe("Polygon Offset"),
				polygonoffsetfactor: z
					.number()
					.optional()
					.describe("Polygon Offset Factor"),
				polygonoffsetunits: z
					.number()
					.optional()
					.describe("Polygon Offset Units"),
			},
			...specificParams,
		})
		.strict();
}

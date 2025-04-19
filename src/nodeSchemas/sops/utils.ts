import { z } from "zod";

/**
 * Create a complete schema for a SOP node type
 * @param specificParams Object containing specific parameters for this SOP type
 * @returns Zod schema with both common and specific parameters
 */
export function createSOPSchema<T extends Record<string, z.ZodTypeAny>>(
	specificParams: T,
) {
	return z
		.object({
			...{
				pageindex: z.number().optional().describe("Page Index"),
				tx: z.number().optional().describe("Translate X"),
				ty: z.number().optional().describe("Translate Y"),
				tz: z.number().optional().describe("Translate Z"),
				rx: z.number().optional().describe("Rotate X"),
				ry: z.number().optional().describe("Rotate Y"),
				rz: z.number().optional().describe("Rotate Z"),
				rord: z.string().optional().describe("Rotate Order"),
				texture: z.string().optional().describe("Texture"),
				normals: z.boolean().optional().describe("Compute Normals"),
				modifybounds: z.boolean().optional().describe("Modify Bounds"),
				reverseanchors: z.boolean().optional().describe("Reverse Anchors"),
				anchoru: z.number().optional().describe("Anchor U"),
				anchorv: z.number().optional().describe("Anchor V"),
				anchorw: z.number().optional().describe("Anchor W"),
			},
			...specificParams,
		})
		.strict();
}

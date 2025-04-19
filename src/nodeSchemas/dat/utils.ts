import { z } from "zod";

/**
 * Create a complete schema for a DAT node type
 * @param specificParams Object containing specific parameters for this DAT type
 * @returns Zod schema with both common and specific parameters
 */
export function createDATSchema<T extends Record<string, z.ZodTypeAny>>(
	specificParams: T,
) {
	return z
		.object({
			...{
				pageindex: z.number().optional().describe("Page Index"),
				language: z.string().optional().describe("Language"),
				extension: z.string().optional().describe("Extension"),
				customext: z.string().optional().describe("Custom Extension"),
				wordwrap: z.string().optional().describe("Word Wrap"),
			},
			...specificParams,
		})
		.strict();
}

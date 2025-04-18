import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for angle CHOP node parameters
 */
export const angle = createCHOPSchema({
	inunit: z.string().optional().describe("Input Unit"),
	inorder: z.string().optional().describe("Input Order"),
	outunit: z.string().optional().describe("Output Unit"),
	outorder: z.string().optional().describe("Output Order"),
});

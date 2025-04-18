import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for blend CHOP node parameters
 */
export const blend = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	firstweight: z.boolean().optional().describe("First Weight"),
	underflow: z.boolean().optional().describe("Underflow"),
});

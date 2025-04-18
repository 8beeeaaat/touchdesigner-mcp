import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for analyze CHOP node parameters
 */
export const analyze = createCHOPSchema({
	function: z.string().optional().describe("Function"),
	allowstart: z.boolean().optional().describe("Allow Start"),
	allowend: z.boolean().optional().describe("Allow End"),
	nopeakvalue: z.number().optional().describe("No Peak Value"),
	valleys: z.boolean().optional().describe("Valleys"),
});

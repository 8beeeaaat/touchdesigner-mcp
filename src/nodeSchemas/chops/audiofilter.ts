import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiofilter CHOP node parameters
 */
export const audiofilter = createCHOPSchema({
	filter: z.string().optional().describe("Filter"),
	units: z.string().optional().describe("Units"),
	cutofflog: z.number().optional().describe("Cutoff Log"),
});

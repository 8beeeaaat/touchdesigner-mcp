import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for copy CHOP node parameters
 */
export const copy = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	output: z.string().optional().describe("Output"),
	threshold: z.number().optional().describe("Threshold"),
	remainder: z.string().optional().describe("Remainder"),
	keep: z.boolean().optional().describe("Keep"),
	stamp: z.boolean().optional().describe("Stamp"),
	copy: z.number().optional().describe("Copy"),
	copy0param: z.string().optional().describe("Copy 0 Parameter"),
	copy0value: z.number().optional().describe("Copy 0 Value"),
});

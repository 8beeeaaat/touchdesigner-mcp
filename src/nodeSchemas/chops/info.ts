import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const info = createCHOPSchema({
	op: z.any().nullable().optional().describe("Operator"),
	infotype: z.string().optional().describe("Info Type"),
	iscope: z.string().optional().describe("Information Scope"),
	values: z.string().optional().describe("Values"),
	range1: z.number().optional().describe("Range 1"),
	range2: z.number().optional().describe("Range 2"),
	passive: z.boolean().optional().describe("Passive"),
	childcooktime: z.boolean().optional().describe("Child Cook Time"),
});

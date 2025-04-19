import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const examine = createDATSchema({
	op: z.any().optional().describe("Op"),
	source: z.string().optional().describe("Source"),
	subkey: z.string().optional().describe("Subkey"),
	expression: z.string().optional().describe("Expression"),
	level: z.string().optional().describe("Level"),
	key: z.string().optional().describe("Key"),
	type: z.string().optional().describe("Type"),
	value: z.string().optional().describe("Value"),
	expandclasses: z.boolean().optional().describe("Expand Classes"),
	maxlevels: z.number().optional().describe("Max Levels"),
	format: z.string().optional().describe("Format"),
	outputheaders: z.boolean().optional().describe("Output Headers"),
	outputlevel: z.boolean().optional().describe("Output Level"),
	outputkey: z.boolean().optional().describe("Output Key"),
	outputtype: z.boolean().optional().describe("Output Type"),
	outputvalue: z.boolean().optional().describe("Output Value"),
});

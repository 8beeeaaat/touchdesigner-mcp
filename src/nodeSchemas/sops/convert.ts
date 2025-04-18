import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const convert = createSOPSchema({
	group: z.string().optional().describe("Group"),
	fromtype: z.string().optional().describe("From Type"),
	totype: z.string().optional().describe("To Type"),
	surftype: z.string().optional().describe("Surface Type"),
	method: z.string().optional().describe("Method"),
	lodu: z.number().optional().describe("LOD U"),
	lodv: z.number().optional().describe("LOD V"),
	lodtrim: z.number().optional().describe("LOD Trim"),
	divu: z.number().optional().describe("Division U"),
	divv: z.number().optional().describe("Division V"),
	divtrim: z.number().optional().describe("Division Trim"),
	orderu: z.number().optional().describe("Order U"),
	orderv: z.number().optional().describe("Order V"),
	new: z.boolean().optional().describe("New"),
	interphull: z.boolean().optional().describe("Interp Hull"),
	prtype: z.string().optional().describe("Primitive Type"),
});

export { convert };

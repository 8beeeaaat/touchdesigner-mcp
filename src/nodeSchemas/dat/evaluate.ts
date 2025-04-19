import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const evaluate = createDATSchema({
	dat: z.any().optional().describe("DAT"),
	datexpr: z.any().optional().describe("DAT Expression"),
	output: z.string().optional().describe("Output"),
	expr: z.string().optional().describe("Expression"),
	outputsize: z.string().optional().describe("Output Size"),
	dependency: z.boolean().optional().describe("Dependency"),
	backslash: z.boolean().optional().describe("Backslash"),
	xfirstrow: z.boolean().optional().describe("X First Row"),
	xfirstcol: z.boolean().optional().describe("X First Col"),
	extractrows: z.string().optional().describe("Extract Rows"),
	rownamestart: z.string().optional().describe("Row Name Start"),
	rowindexstart: z.number().optional().describe("Row Index Start"),
	rownameend: z.string().optional().describe("Row Name End"),
	rownames: z.string().optional().describe("Row Names"),
	fromcol: z.number().optional().describe("From Col"),
	extractcols: z.string().optional().describe("Extract Cols"),
	colnamestart: z.string().optional().describe("Column Name Start"),
	colindexstart: z.number().optional().describe("Column Index Start"),
	colnameend: z.string().optional().describe("Column Name End"),
	colnames: z.string().optional().describe("Column Names"),
	fromrow: z.number().optional().describe("From Row"),
});

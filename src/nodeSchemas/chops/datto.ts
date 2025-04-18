import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

// http://ted-kanakubo.com/touchdesigner-jp/?p=169 を参考に作成
export const datto = createCHOPSchema({
	dat: z.any().nullable().optional().describe("DAT"),

	extractrows: z.string().optional().describe("Select Rows"),
	rownamestart: z.string().optional().describe("Start Row Name"),
	rowindexstart: z
		.union([z.number(), z.string()])
		.optional()
		.describe("Start Row Index"),
	rownameend: z.string().optional().describe("End Row Name"),
	rowindexend: z.any().optional().describe("End Row Index"),
	rownames: z.string().optional().describe("Row Select Values"),
	rowexpr: z.any().optional().describe("Row Select Condition"),
	fromrow: z.union([z.number(), z.string()]).optional().describe("From Row"),

	extractcols: z.string().optional().describe("Select Cols"),
	colnamestart: z.string().optional().describe("Start Col Name"),
	colindexstart: z
		.union([z.number(), z.string()])
		.optional()
		.describe("Start Col Index"),
	colnameend: z.string().optional().describe("End Col Name"),
	colindexend: z.any().optional().describe("End Col Index"),
	colnames: z.string().optional().describe("Col Select Values"),
	colexpr: z.any().optional().describe("Col Select Condition"),
	fromcol: z.union([z.number(), z.string()]).optional().describe("From Column"),

	output: z.string().optional().describe("Output"),
	firstrow: z.string().optional().describe("First Row is"),
	firstcolumn: z.string().optional().describe("First Column is"),
	defval: z.number().optional().describe("Default Value"),
	duplicate: z.string().optional().describe("Duplicate"),
});

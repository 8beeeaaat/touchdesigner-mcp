import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const substitute = createDATSchema({
	before: z.string().optional().describe("Before"),
	after: z.string().optional().describe("After"),
	match: z.string().optional().describe("Match"),
	case: z.boolean().optional().describe("Case Sensitive"),
	expand: z.boolean().optional().describe("Expand"),
	expandto: z.boolean().optional().describe("Expand To"),
	first: z.boolean().optional().describe("First"),
	xfirstrow: z.boolean().optional().describe("First Row"),
	xfirstcol: z.boolean().optional().describe("First Col"),
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

import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const json = createDATSchema({
	output: z.string().optional().describe("Output"),
	filter: z.string().optional().describe("Filter"),
	expression: z.string().optional().describe("Expression"),
	outputformat: z.string().optional().describe("Output Format"),
	holdlast: z.boolean().optional().describe("Hold Last"),
	columns: z.string().optional().describe("Columns"),
	transpose: z.boolean().optional().describe("Transpose"),
});

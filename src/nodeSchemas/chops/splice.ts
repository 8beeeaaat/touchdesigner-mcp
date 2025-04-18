import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const splice = createCHOPSchema({
	outputtrimmed: z.boolean().optional().describe("Output Trimmed"),
	direction: z.string().optional().describe("Direction"),
	start: z.number().optional().describe("Start"),
	units: z.string().optional().describe("Units"),
	trimmethod: z.string().optional().describe("Trim Method"),
	trimlength: z.number().optional().describe("Trim Length"),
	trimlengthunits: z.string().optional().describe("Trim Length Units"),
	insertmethod: z.string().optional().describe("Insert Method"),
	insertlength: z.number().optional().describe("Insert Length"),
	insertunits: z.string().optional().describe("Insert Units"),
	insertinterp: z.string().optional().describe("Insert Interpolation"),
	match: z.string().optional().describe("Match"),
	unmatchedinterp: z.string().optional().describe("Unmatched Interpolation"),
});

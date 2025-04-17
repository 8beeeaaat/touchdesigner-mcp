import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const deleteNode = createCHOPSchema({
	delchannels: z.boolean().optional().describe("Delete Channels"),
	discard: z.string().optional().describe("Discard"),
	select: z.string().optional().describe("Select"),
	delscope: z.string().optional().describe("Delete Scope"),
	selnumbers: z.string().optional().describe("Select Numbers"),
	chanvalue: z.string().optional().describe("Channel Value"),
	selrange1: z.number().optional().describe("Select Range 1"),
	selrange2: z.number().optional().describe("Select Range 2"),
	selconst: z.boolean().optional().describe("Select Constant"),
	delsamples: z.boolean().optional().describe("Delete Samples"),
	compchans: z.string().optional().describe("Compare Channels"),
	compnames: z.string().optional().describe("Compare Names"),
	compnums: z.string().optional().describe("Compare Numbers"),
	compmulti: z.string().optional().describe("Compare Multi"),
	condition: z.string().optional().describe("Condition"),
	value1: z.number().optional().describe("Value 1"),
	inclvalue1: z.boolean().optional().describe("Include Value 1"),
	value2: z.number().optional().describe("Value 2"),
	inclvalue2: z.boolean().optional().describe("Include Value 2"),
	deletecomp: z.boolean().optional().describe("Delete Compare"),
	uniqsamples: z.boolean().optional().describe("Unique Samples"),
	uniqtol: z.number().optional().describe("Unique Tolerance"),
	onesample: z.boolean().optional().describe("One Sample"),
});

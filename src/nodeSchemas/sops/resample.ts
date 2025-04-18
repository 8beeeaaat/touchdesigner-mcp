import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const resample = createSOPSchema({
	group: z.string().optional().describe("Group"),
	lod: z.number().optional().describe("Level of Detail"),
	edge: z.boolean().optional().describe("Edge"),
	method: z.string().optional().describe("Method"),
	measure: z.string().optional().describe("Measure"),
	dolength: z.boolean().optional().describe("Do Length"),
	length: z.number().optional().describe("Length"),
	dosegs: z.boolean().optional().describe("Do Segments"),
	segs: z.number().optional().describe("Segments"),
	last: z.boolean().optional().describe("Last"),
});

export { resample };

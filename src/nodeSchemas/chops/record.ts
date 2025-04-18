import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const record = createCHOPSchema({
	record: z.string().optional().describe("Record"),
	sample: z.string().optional().describe("Sample"),
	interp: z.string().optional().describe("Interpolation"),
	output: z.string().optional().describe("Output"),
	segment1: z.number().optional().describe("Segment 1"),
	segment2: z.number().optional().describe("Segment 2"),
	segmentunit: z.string().optional().describe("Segment Unit"),
	reset: z.boolean().optional().describe("Reset"),
	resetcondition: z.string().optional().describe("Reset Condition"),
});

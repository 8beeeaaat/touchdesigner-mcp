import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const logic = createCHOPSchema({
	convert: z.string().optional().describe("Convert"),
	preop: z.string().optional().describe("Pre-operation"),
	chanop: z.string().optional().describe("Channel Operation"),
	chopop: z.string().optional().describe("CHOP Operation"),
	match: z.string().optional().describe("Match"),
	align: z.string().optional().describe("Align"),
	boundmin: z.number().optional().describe("Bound Minimum"),
	boundmax: z.number().optional().describe("Bound Maximum"),
});

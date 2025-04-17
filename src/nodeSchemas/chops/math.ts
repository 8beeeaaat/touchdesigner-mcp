import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const math = createCHOPSchema({
	preop: z.string().optional().describe("Pre-operation"),
	chanop: z.string().optional().describe("Channel Operation"),
	chopop: z.string().optional().describe("CHOP Operation"),
	postop: z.string().optional().describe("Post-operation"),
	match: z.string().optional().describe("Match"),
	align: z.string().optional().describe("Align"),
	interppars: z.boolean().optional().describe("Interpolate Parameters"),
	integer: z.string().optional().describe("Integer"),
	preoff: z.number().optional().describe("Pre Offset"),
	gain: z.number().optional().describe("Gain"),
	postoff: z.number().optional().describe("Post Offset"),
	fromrange1: z.number().optional().describe("From Range 1"),
	fromrange2: z.number().optional().describe("From Range 2"),
	torange1: z.number().optional().describe("To Range 1"),
	torange2: z.number().optional().describe("To Range 2"),
});

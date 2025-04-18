import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for composite CHOP node parameters
 */
export const composite = createCHOPSchema({
	base: z.number().optional().describe("Base"),
	match: z.string().optional().describe("Match"),
	quatrot: z.boolean().optional().describe("Quaternion Rotation"),
	shortrot: z.boolean().optional().describe("Short Rotation"),
	rotscope: z.string().optional().describe("Rotation Scope"),
	cyclelen: z.number().optional().describe("Cycle Length"),
	effect: z.number().optional().describe("Effect"),
	relative: z.string().optional().describe("Relative"),
	start: z.number().optional().describe("Start"),
	startunit: z.string().optional().describe("Start Unit"),
	peak: z.number().optional().describe("Peak"),
	peakunit: z.string().optional().describe("Peak Unit"),
	release: z.number().optional().describe("Release"),
	releaseunit: z.string().optional().describe("Release Unit"),
	end: z.number().optional().describe("End"),
	endunit: z.string().optional().describe("End Unit"),
	risefunc: z.string().optional().describe("Rise Function"),
	fallfunc: z.string().optional().describe("Fall Function"),
});

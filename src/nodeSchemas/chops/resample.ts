import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const resample = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	rate: z.number().optional().describe("Rate"),
	relative: z.string().optional().describe("Relative"),
	start: z.number().optional().describe("Start"),
	startunit: z.string().optional().describe("Start Unit"),
	end: z.number().optional().describe("End"),
	endunit: z.string().optional().describe("End Unit"),
	quatrot: z.boolean().optional().describe("Quaternion Rotation"),
	interp: z.string().optional().describe("Interpolation"),
	constarea: z.boolean().optional().describe("Constant Area"),
	correct: z.boolean().optional().describe("Correct"),
	cyclelen: z.number().optional().describe("Cycle Length"),
});

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const stretch = createCHOPSchema({
	interp: z.string().optional().describe("Interpolation"),
	constarea: z.boolean().optional().describe("Constant Area"),
	relative: z.string().optional().describe("Relative"),
	start: z.number().optional().describe("Start"),
	startunit: z.string().optional().describe("Start Unit"),
	end: z.number().optional().describe("End"),
	endunit: z.string().optional().describe("End Unit"),
	scale: z.number().optional().describe("Scale"),
	reverse: z.boolean().optional().describe("Reverse"),
});

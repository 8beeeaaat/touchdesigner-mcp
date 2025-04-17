import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const trim = createCHOPSchema({
	relative: z.string().optional().describe("Relative"),
	start: z.number().optional().describe("Start"),
	startunit: z.string().optional().describe("Start Unit"),
	end: z.number().optional().describe("End"),
	endunit: z.string().optional().describe("End Unit"),
	discard: z.string().optional().describe("Discard"),
	shiftstart: z.boolean().optional().describe("Shift Start"),
});

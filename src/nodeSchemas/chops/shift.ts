import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const shift = createCHOPSchema({
	reference: z.string().optional().describe("Reference"),
	relative: z.string().optional().describe("Relative"),
	start: z.number().optional().describe("Start"),
	startunit: z.string().optional().describe("Start Unit"),
	end: z.number().optional().describe("End"),
	endunit: z.string().optional().describe("End Unit"),
	scroll: z.number().optional().describe("Scroll"),
	scrollunit: z.string().optional().describe("Scroll Unit"),
});

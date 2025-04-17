import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for constant CHOP node parameters
 */
export const constant = createCHOPSchema({
	const: z.number().optional().describe("Constant"),
	const0name: z.string().optional().describe("Channel 1 Name"),
	const0value: z.number().optional().describe("Channel 1 Value"),
	snap: z.boolean().optional().describe("Snap"),
	first: z.number().optional().describe("First"),
	current: z.boolean().optional().describe("Current"),
	single: z.boolean().optional().describe("Single"),
	start: z.number().optional().describe("Start"),
	startunit: z.string().optional().describe("Start Unit"),
	end: z.number().optional().describe("End"),
	endunit: z.string().optional().describe("End Unit"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left"),
	right: z.string().optional().describe("Right"),
	defval: z.number().optional().describe("Default Value"),
});

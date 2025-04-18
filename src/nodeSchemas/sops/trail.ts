import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const trail = createSOPSchema({
	result: z.string().optional().describe("Result"),
	length: z.number().optional().describe("Length"),
	inc: z.number().optional().describe("Increment"),
	cache: z.number().optional().describe("Cache"),
	evalframe: z.boolean().optional().describe("Eval Frame"),
	surftype: z.string().optional().describe("Surface Type"),
	close: z.boolean().optional().describe("Close"),
	velscale: z.number().optional().describe("Velocity Scale"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

export { trail };

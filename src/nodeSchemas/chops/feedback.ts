import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const feedback = createCHOPSchema({
	output: z.string().optional().describe("Output"),
	delta: z.boolean().optional().describe("Delta"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

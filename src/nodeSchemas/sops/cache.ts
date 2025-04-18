import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const cache = createSOPSchema({
	active: z.boolean().optional().describe("Active"),
	prefill: z.boolean().optional().describe("Pre-fill"),
	cachesize: z.number().optional().describe("Cache Size"),
	step: z.number().optional().describe("Step"),
	outputindex: z.number().optional().describe("Output Index"),
	cachepoints: z.boolean().optional().describe("Cache Points"),
	blendpos: z.boolean().optional().describe("Blend Position"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

export { cache };

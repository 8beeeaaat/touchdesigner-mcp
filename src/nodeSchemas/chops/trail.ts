import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const trail = createCHOPSchema({
	growlength: z.boolean().optional().describe("Grow Length"),
	wlength: z.number().optional().describe("Window Length"),
	wlengthunit: z.string().optional().describe("Window Length Unit"),
	capture: z.string().optional().describe("Capture"),
	resample: z.boolean().optional().describe("Resample"),
	samples: z.number().optional().describe("Samples"),
	setrate: z.boolean().optional().describe("Set Rate"),
	rate: z.number().optional().describe("Rate"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

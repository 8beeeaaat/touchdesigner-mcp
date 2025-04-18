import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const gesture = createCHOPSchema({
	playmode: z.string().optional().describe("Play Mode"),
	fitmethod: z.boolean().optional().describe("Fit Method"),
	numbeats: z.number().optional().describe("Number of Beats"),
	step: z.boolean().optional().describe("Step"),
	stepreset: z.boolean().optional().describe("Step Reset"),
	blend: z.number().optional().describe("Blend"),
	blendunit: z.string().optional().describe("Blend Unit"),
	interp: z.boolean().optional().describe("Interpolate"),
	speed: z.number().optional().describe("Speed"),
	speedunit: z.string().optional().describe("Speed Unit"),
	resetcondition: z.string().optional().describe("Reset Condition"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

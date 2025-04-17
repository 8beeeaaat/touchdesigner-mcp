import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const cycle = createCHOPSchema({
	before: z.number().optional().describe("Before"),
	after: z.number().optional().describe("After"),
	mirror: z.boolean().optional().describe("Mirror"),
	extremes: z.boolean().optional().describe("Extremes"),
	blendmethod: z.string().optional().describe("Blend Method"),
	blendfunc: z.string().optional().describe("Blend Function"),
	blendregion: z.number().optional().describe("Blend Region"),
	blendregionunit: z.string().optional().describe("Blend Region Unit"),
	blendbias: z.number().optional().describe("Blend Bias"),
	step: z.number().optional().describe("Step"),
	stepscope: z.string().optional().describe("Step Scope"),
});

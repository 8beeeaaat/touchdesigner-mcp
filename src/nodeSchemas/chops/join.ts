import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const join = createCHOPSchema({
	chops: z.any().nullable().optional().describe("CHOPs"),
	blendmethod: z.string().optional().describe("Blend Method"),
	blendfunc: z.string().optional().describe("Blend Function"),
	blendbyinput: z.boolean().optional().describe("Blend by Input"),
	blendregion: z.number().optional().describe("Blend Region"),
	blendregionunit: z.string().optional().describe("Blend Region Unit"),
	blendbias: z.number().optional().describe("Blend Bias"),
	match: z.string().optional().describe("Match"),
	step: z.number().optional().describe("Step"),
	stepscope: z.string().optional().describe("Step Scope"),
	blendscope: z.string().optional().describe("Blend Scope"),
	transscopex: z.string().optional().describe("Transform Scope X"),
	transscopey: z.string().optional().describe("Transform Scope Y"),
	transscopez: z.string().optional().describe("Transform Scope Z"),
	quatrot: z.boolean().optional().describe("Quaternion Rotation"),
	shortrot: z.boolean().optional().describe("Short Rotation"),
	rotscope: z.string().optional().describe("Rotation Scope"),
	cyclelen: z.number().optional().describe("Cycle Length"),
});

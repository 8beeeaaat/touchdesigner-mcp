import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const stitch = createSOPSchema({
	group: z.string().optional().describe("Group"),
	stitchop: z.string().optional().describe("Stitch Operation"),
	inc: z.number().optional().describe("Increment"),
	loop: z.boolean().optional().describe("Loop"),
	dir: z.string().optional().describe("Direction"),
	tolerance: z.number().optional().describe("Tolerance"),
	bias: z.number().optional().describe("Bias"),
	leftuv1: z.number().optional().describe("Left UV 1"),
	leftuv2: z.number().optional().describe("Left UV 2"),
	rightuv1: z.number().optional().describe("Right UV 1"),
	rightuv2: z.number().optional().describe("Right UV 2"),
	lrwidth1: z.number().optional().describe("Left/Right Width 1"),
	lrwidth2: z.number().optional().describe("Left/Right Width 2"),
	dostitch: z.boolean().optional().describe("Do Stitch"),
	dotangent: z.boolean().optional().describe("Do Tangent"),
	sharp: z.boolean().optional().describe("Sharp"),
	fixed: z.boolean().optional().describe("Fixed"),
	lrscale1: z.number().optional().describe("Left/Right Scale 1"),
	lrscale2: z.number().optional().describe("Left/Right Scale 2"),
});

export { stitch };

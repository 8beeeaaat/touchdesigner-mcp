import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const align = createSOPSchema({
	group: z.string().optional().describe("Group"),
	align: z.string().optional().describe("Align"),
	inc: z.number().optional().describe("Increment"),
	bias: z.number().optional().describe("Bias"),
	leftuv1: z.number().optional().describe("Left UV 1"),
	leftuv2: z.number().optional().describe("Left UV 2"),
	rightuv1: z.number().optional().describe("Right UV 1"),
	rightuv2: z.number().optional().describe("Right UV 2"),
	rightuvend1: z.number().optional().describe("Right UV End 1"),
	rightuvend2: z.number().optional().describe("Right UV End 2"),
	individual: z.boolean().optional().describe("Individual"),
	dotrans: z.boolean().optional().describe("Do Translate"),
	dorotate: z.boolean().optional().describe("Do Rotate"),
	xord: z.string().optional().describe("Transform Order"),
	sx: z.number().optional().describe("Scale X"),
	sy: z.number().optional().describe("Scale Y"),
	sz: z.number().optional().describe("Scale Z"),
	px: z.number().optional().describe("Pivot X"),
	py: z.number().optional().describe("Pivot Y"),
	pz: z.number().optional().describe("Pivot Z"),
});

export { align };

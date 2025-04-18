import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const fillet = createSOPSchema({
	group: z.string().optional().describe("Group"),
	fillet: z.string().optional().describe("Fillet"),
	inc: z.number().optional().describe("Increment"),
	loop: z.boolean().optional().describe("Loop"),
	dir: z.string().optional().describe("Direction"),
	fillettype: z.string().optional().describe("Fillet Type"),
	primtype: z.string().optional().describe("Primitive Type"),
	order: z.number().optional().describe("Order"),
	leftuv1: z.number().optional().describe("Left UV 1"),
	leftuv2: z.number().optional().describe("Left UV 2"),
	rightuv1: z.number().optional().describe("Right UV 1"),
	rightuv2: z.number().optional().describe("Right UV 2"),
	lrwidth1: z.number().optional().describe("LR Width 1"),
	lrwidth2: z.number().optional().describe("LR Width 2"),
	lrscale1: z.number().optional().describe("LR Scale 1"),
	lrscale2: z.number().optional().describe("LR Scale 2"),
	lroffset1: z.number().optional().describe("LR Offset 1"),
	lroffset2: z.number().optional().describe("LR Offset 2"),
	seamless: z.boolean().optional().describe("Seamless"),
	cut: z.boolean().optional().describe("Cut"),
});

export { fillet };

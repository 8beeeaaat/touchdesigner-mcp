import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const join = createSOPSchema({
	group: z.string().optional().describe("Group"),
	blend: z.boolean().optional().describe("Blend"),
	tolerance: z.number().optional().describe("Tolerance"),
	bias: z.number().optional().describe("Bias"),
	knotmult: z.boolean().optional().describe("Knot Multiplicity"),
	proximity: z.boolean().optional().describe("Proximity"),
	dir: z.string().optional().describe("Direction"),
	joinop: z.string().optional().describe("Join Operation"),
	inc: z.number().optional().describe("Increment"),
	loop: z.boolean().optional().describe("Loop"),
	prim: z.boolean().optional().describe("Primitive"),
});

export { join };

import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const lattice = createSOPSchema({
	group: z.string().optional().describe("Group"),
	deformtype: z.string().optional().describe("Deform Type"),
	divsx: z.number().optional().describe("Divisions X"),
	divsy: z.number().optional().describe("Divisions Y"),
	divsz: z.number().optional().describe("Divisions Z"),
	kernel: z.string().optional().describe("Kernel"),
	radius: z.number().optional().describe("Radius"),
});

export { lattice };

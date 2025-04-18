import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const subdivide = createSOPSchema({
	subdivide: z.string().optional().describe("Subdivide"),
	creases: z.string().optional().describe("Creases"),
	iterations: z.number().optional().describe("Iterations"),
	overridecrease: z.boolean().optional().describe("Override Crease"),
	creaseweight: z.number().optional().describe("Crease Weight"),
	outputcrease: z.boolean().optional().describe("Output Crease"),
	outcreasegroup: z.string().optional().describe("Output Crease Group"),
	closeholes: z.string().optional().describe("Close Holes"),
	surroundpoly: z.string().optional().describe("Surround Polygon"),
	bias: z.number().optional().describe("Bias"),
});

export { subdivide };

import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const lod = createSOPSchema({
	steppercent: z.number().optional().describe("Step Percent"),
	distance: z.number().optional().describe("Distance"),
	minpercent: z.number().optional().describe("Minimum Percent"),
	borderweight: z.number().optional().describe("Border Weight"),
	lengthweight: z.number().optional().describe("Length Weight"),
	triangulate: z.boolean().optional().describe("Triangulate"),
	tstrips: z.boolean().optional().describe("Triangle Strips"),
	polysonly: z.boolean().optional().describe("Polygons Only"),
});

export { lod };

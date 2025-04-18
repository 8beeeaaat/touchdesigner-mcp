import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const isosurface = createSOPSchema({
	func: z.number().optional().describe("Function"),
	minx: z.number().optional().describe("Min X"),
	miny: z.number().optional().describe("Min Y"),
	minz: z.number().optional().describe("Min Z"),
	maxx: z.number().optional().describe("Max X"),
	maxy: z.number().optional().describe("Max Y"),
	maxz: z.number().optional().describe("Max Z"),
	divsx: z.number().optional().describe("Divisions X"),
	divsy: z.number().optional().describe("Divisions Y"),
	divsz: z.number().optional().describe("Divisions Z"),
	normals: z.boolean().optional().describe("Normals"),
});

export { isosurface };

import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const polyreduce = createSOPSchema({
	reduce: z.string().optional().describe("Reduce"),
	creases: z.string().optional().describe("Creases"),
	method: z.string().optional().describe("Method"),
	percentage: z.number().optional().describe("Percentage"),
	numpolys: z.number().optional().describe("Number of Polygons"),
	obj: z.any().nullable().optional().describe("Object"),
	distance: z.number().optional().describe("Distance"),
	minpercent: z.number().optional().describe("Minimum Percentage"),
	borderweight: z.number().optional().describe("Border Weight"),
	creaseweight: z.number().optional().describe("Crease Weight"),
	lengthweight: z.number().optional().describe("Length Weight"),
	meshinvert: z.boolean().optional().describe("Mesh Invert"),
	triangulate: z.boolean().optional().describe("Triangulate"),
	keepedges: z.boolean().optional().describe("Keep Edges"),
	originalpoints: z.boolean().optional().describe("Original Points"),
});

export { polyreduce };

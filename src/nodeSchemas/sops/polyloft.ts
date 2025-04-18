import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const polyloft = createSOPSchema({
	proximity: z.boolean().optional().describe("Proximity"),
	consolidate: z.boolean().optional().describe("Consolidate"),
	dist: z.number().optional().describe("Distance"),
	minimize: z.string().optional().describe("Minimize"),
	closeu: z.string().optional().describe("Close U"),
	closev: z.string().optional().describe("Close V"),
	creategroup: z.boolean().optional().describe("Create Group"),
	polygroup: z.string().optional().describe("Polygon Group"),
	method: z.string().optional().describe("Method"),
	group: z.string().optional().describe("Group"),
	prim: z.boolean().optional().describe("Primitive"),
	point: z.number().optional().describe("Point"),
	point0group: z.string().optional().describe("Point 0 Group"),
});

export { polyloft };

import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const facet = createSOPSchema({
	group: z.string().optional().describe("Group"),
	unit: z.boolean().optional().describe("Unit"),
	prenml: z.boolean().optional().describe("Pre-compute Normals"),
	unique: z.boolean().optional().describe("Unique"),
	cons: z.string().optional().describe("Consolidate"),
	dist: z.number().optional().describe("Distance"),
	inline: z.boolean().optional().describe("Inline"),
	inlinedist: z.number().optional().describe("Inline Distance"),
	orientpolys: z.boolean().optional().describe("Orient Polygons"),
	cusp: z.boolean().optional().describe("Cusp"),
	angle: z.number().optional().describe("Angle"),
	remove: z.boolean().optional().describe("Remove"),
	postnml: z.boolean().optional().describe("Post-compute Normals"),
});

export { facet };

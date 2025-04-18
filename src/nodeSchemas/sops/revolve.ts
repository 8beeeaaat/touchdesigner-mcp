import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const revolve = createSOPSchema({
	group: z.string().optional().describe("Group"),
	surftype: z.string().optional().describe("Surface Type"),
	originx: z.number().optional().describe("Origin X"),
	originy: z.number().optional().describe("Origin Y"),
	originz: z.number().optional().describe("Origin Z"),
	dirx: z.number().optional().describe("Direction X"),
	diry: z.number().optional().describe("Direction Y"),
	dirz: z.number().optional().describe("Direction Z"),
	polys: z.boolean().optional().describe("Polygons"),
	imperfect: z.boolean().optional().describe("Imperfect"),
	type: z.string().optional().describe("Type"),
	beginangle: z.number().optional().describe("Begin Angle"),
	endangle: z.number().optional().describe("End Angle"),
	divs: z.number().optional().describe("Divisions"),
	order: z.number().optional().describe("Order"),
	cap: z.boolean().optional().describe("Cap"),
});

export { revolve };

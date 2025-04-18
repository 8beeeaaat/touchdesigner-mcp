import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const tube = createSOPSchema({
	type: z.string().optional().describe("Type"),
	surftype: z.string().optional().describe("Surface Type"),
	orient: z.string().optional().describe("Orient"),
	orientbounds: z.boolean().optional().describe("Orient Bounds"),
	rad1: z.number().optional().describe("Radius 1"),
	rad2: z.number().optional().describe("Radius 2"),
	height: z.number().optional().describe("Height"),
	imperfect: z.boolean().optional().describe("Imperfect"),
	rows: z.number().optional().describe("Rows"),
	cols: z.number().optional().describe("Columns"),
	orderu: z.number().optional().describe("Order U"),
	orderv: z.number().optional().describe("Order V"),
	cap: z.boolean().optional().describe("Cap"),
});

export { tube };

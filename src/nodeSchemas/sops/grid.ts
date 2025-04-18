import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const grid = createSOPSchema({
	type: z.string().optional().describe("Type"),
	surftype: z.string().optional().describe("Surface Type"),
	orient: z.string().optional().describe("Orient"),
	sizex: z.number().optional().describe("Size X"),
	sizey: z.number().optional().describe("Size Y"),
	rows: z.number().optional().describe("Rows"),
	cols: z.number().optional().describe("Columns"),
	orderu: z.number().optional().describe("Order U"),
	orderv: z.number().optional().describe("Order V"),
	interpu: z.boolean().optional().describe("Interpolate U"),
	interpv: z.boolean().optional().describe("Interpolate V"),
});

export { grid };

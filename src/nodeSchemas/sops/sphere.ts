import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const sphere = createSOPSchema({
	type: z.string().optional().describe("Type"),
	surftype: z.string().optional().describe("Surface Type"),
	orientbounds: z.boolean().optional().describe("Orient Bounds"),
	radx: z.number().optional().describe("Radius X"),
	rady: z.number().optional().describe("Radius Y"),
	radz: z.number().optional().describe("Radius Z"),
	orient: z.string().optional().describe("Orient"),
	freq: z.number().optional().describe("Frequency"),
	rows: z.number().optional().describe("Rows"),
	cols: z.number().optional().describe("Columns"),
	orderu: z.number().optional().describe("Order U"),
	orderv: z.number().optional().describe("Order V"),
	imperfect: z.boolean().optional().describe("Imperfect"),
	upole: z.boolean().optional().describe("U Pole"),
});

export { sphere };

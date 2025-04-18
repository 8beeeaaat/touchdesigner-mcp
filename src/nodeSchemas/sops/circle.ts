import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const circle = createSOPSchema({
	type: z.string().optional().describe("Type"),
	orient: z.string().optional().describe("Orient"),
	radx: z.number().optional().describe("Radius X"),
	rady: z.number().optional().describe("Radius Y"),
	order: z.number().optional().describe("Order"),
	divs: z.number().optional().describe("Divisions"),
	arc: z.string().optional().describe("Arc"),
	beginangle: z.number().optional().describe("Begin Angle"),
	endangle: z.number().optional().describe("End Angle"),
	imperfect: z.boolean().optional().describe("Imperfect"),
});

export { circle };

import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const superquad = createSOPSchema({
	type: z.string().optional().describe("Type"),
	surftype: z.string().optional().describe("Surface Type"),
	radx: z.number().optional().describe("Radius X"),
	rady: z.number().optional().describe("Radius Y"),
	radz: z.number().optional().describe("Radius Z"),
	orient: z.string().optional().describe("Orientation"),
	rows: z.number().optional().describe("Rows"),
	cols: z.number().optional().describe("Columns"),
	expxy: z.number().optional().describe("Exponent XY"),
	expz: z.number().optional().describe("Exponent Z"),
	upole: z.boolean().optional().describe("U Pole"),
	cusp: z.boolean().optional().describe("Cusp"),
	angle: z.number().optional().describe("Angle"),
});

export { superquad };

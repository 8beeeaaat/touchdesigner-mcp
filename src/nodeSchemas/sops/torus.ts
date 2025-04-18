import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const torus = createSOPSchema({
	type: z.string().optional().describe("Type"),
	surftype: z.string().optional().describe("Surface Type"),
	orient: z.string().optional().describe("Orient"),
	radx: z.number().optional().describe("Major Radius"),
	rady: z.number().optional().describe("Minor Radius"),
	rows: z.number().optional().describe("Rows"),
	cols: z.number().optional().describe("Columns"),
	angleoffset: z.number().optional().describe("Angle Offset"),
	imperfect: z.boolean().optional().describe("Imperfect"),
	orderu: z.number().optional().describe("Order U"),
	orderv: z.number().optional().describe("Order V"),
	beginangleu: z.number().optional().describe("Begin Angle U"),
	endangleu: z.number().optional().describe("End Angle U"),
	beginanglev: z.number().optional().describe("Begin Angle V"),
	endanglev: z.number().optional().describe("End Angle V"),
	closeu: z.boolean().optional().describe("Close U"),
	closev: z.boolean().optional().describe("Close V"),
	capu: z.boolean().optional().describe("Cap U"),
	capv: z.boolean().optional().describe("Cap V"),
});

export { torus };

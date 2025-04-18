import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const sort = createSOPSchema({
	ptsort: z.string().optional().describe("Point Sort"),
	pointseed: z.number().optional().describe("Point Seed"),
	pointoffset: z.number().optional().describe("Point Offset"),
	pointproxx: z.number().optional().describe("Point Proxy X"),
	pointproxy: z.number().optional().describe("Point Proxy Y"),
	pointproxz: z.number().optional().describe("Point Proxy Z"),
	pointobj: z.union([z.string(), z.null()]).optional().describe("Point Object"),
	pointdirx: z.number().optional().describe("Point Direction X"),
	pointdiry: z.number().optional().describe("Point Direction Y"),
	pointdirz: z.number().optional().describe("Point Direction Z"),
	primsort: z.string().optional().describe("Primitive Sort"),
	primseed: z.number().optional().describe("Primitive Seed"),
	primoffset: z.number().optional().describe("Primitive Offset"),
	primproxx: z.number().optional().describe("Primitive Proxy X"),
	primproxy: z.number().optional().describe("Primitive Proxy Y"),
	primproxz: z.number().optional().describe("Primitive Proxy Z"),
	primobj: z
		.union([z.string(), z.null()])
		.optional()
		.describe("Primitive Object"),
	primdirx: z.number().optional().describe("Primitive Direction X"),
	primdiry: z.number().optional().describe("Primitive Direction Y"),
	primdirz: z.number().optional().describe("Primitive Direction Z"),
	partsort: z.string().optional().describe("Part Sort"),
	partreverse: z.boolean().optional().describe("Part Reverse"),
	partoffset: z.number().optional().describe("Part Offset"),
	partproxx: z.number().optional().describe("Part Proxy X"),
	partproxy: z.number().optional().describe("Part Proxy Y"),
	partproxz: z.number().optional().describe("Part Proxy Z"),
	partobj: z.union([z.string(), z.null()]).optional().describe("Part Object"),
	partdirx: z.number().optional().describe("Part Direction X"),
	partdiry: z.number().optional().describe("Part Direction Y"),
	partdirz: z.number().optional().describe("Part Direction Z"),
});

export { sort };

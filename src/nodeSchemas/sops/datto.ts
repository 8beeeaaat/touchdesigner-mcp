import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const datto = createSOPSchema({
	pointsdat: z.union([z.string(), z.null()]).optional().describe("Points DAT"),
	verticesdat: z
		.union([z.string(), z.null()])
		.optional()
		.describe("Vertices DAT"),
	primsdat: z
		.union([z.string(), z.null()])
		.optional()
		.describe("Primitives DAT"),
	detaildat: z.union([z.string(), z.null()]).optional().describe("Detail DAT"),
	merge: z.string().optional().describe("Merge"),
	float: z.string().optional().describe("Float"),
	int: z.string().optional().describe("Integer"),
	string: z.string().optional().describe("String"),
	build: z.string().optional().describe("Build"),
	n: z.number().optional().describe("N"),
	closed: z.boolean().optional().describe("Closed"),
	closedv: z.boolean().optional().describe("Closed V"),
	connect: z.string().optional().describe("Connect"),
	prtype: z.string().optional().describe("Primitive Type"),
});

export { datto };

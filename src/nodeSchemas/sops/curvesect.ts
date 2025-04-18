import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const curvesect = createSOPSchema({
	leftgroup: z.string().optional().describe("Left Group"),
	rightgroup: z.string().optional().describe("Right Group"),
	xsect: z.boolean().optional().describe("Cross Section"),
	tolerance: z.number().optional().describe("Tolerance"),
	method: z.string().optional().describe("Method"),
	left: z.string().optional().describe("Left"),
	right: z.string().optional().describe("Right"),
	affect: z.string().optional().describe("Affect"),
	extractpt: z.boolean().optional().describe("Extract Point"),
	keeporiginal: z.boolean().optional().describe("Keep Original"),
});

export { curvesect };

import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const polyspline = createSOPSchema({
	group: z.string().optional().describe("Group"),
	basis: z.string().optional().describe("Basis"),
	closure: z.string().optional().describe("Closure"),
	divide: z.string().optional().describe("Divide"),
	segsize: z.number().optional().describe("Segment Size"),
	polydivs: z.number().optional().describe("Polygon Divisions"),
	edgedivs: z.number().optional().describe("Edge Divisions"),
	first: z.number().optional().describe("First"),
	last: z.number().optional().describe("Last"),
	tension: z.number().optional().describe("Tension"),
});

export { polyspline };

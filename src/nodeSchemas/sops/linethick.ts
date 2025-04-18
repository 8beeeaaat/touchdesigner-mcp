import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const linethick = createSOPSchema({
	group: z.string().optional().describe("Group"),
	startwidth1: z.number().optional().describe("Start Width 1"),
	startwidth2: z.number().optional().describe("Start Width 2"),
	endwidth1: z.number().optional().describe("End Width 1"),
	endwidth2: z.number().optional().describe("End Width 2"),
	divisions: z.number().optional().describe("Divisions"),
	rows: z.number().optional().describe("Rows"),
	domain1: z.number().optional().describe("Domain 1"),
	domain2: z.number().optional().describe("Domain 2"),
	shape: z.string().optional().describe("Shape"),
	symmetric: z.boolean().optional().describe("Symmetric"),
});

export { linethick };

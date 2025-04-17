import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const handle = createCHOPSchema({
	source: z.any().nullable().optional().describe("Source"),
	fixed: z.any().nullable().optional().describe("Fixed"),
	iterations: z.number().optional().describe("Iterations"),
	init: z.number().optional().describe("Init"),
	preroll: z.number().optional().describe("Preroll"),
	delta: z.number().optional().describe("Delta"),
});

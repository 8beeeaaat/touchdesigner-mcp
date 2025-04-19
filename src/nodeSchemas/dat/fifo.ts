import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const fifo = createDATSchema({
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
	firstrow: z.boolean().optional().describe("First Row"),
});

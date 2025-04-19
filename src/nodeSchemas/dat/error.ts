import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const error = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	source: z.string().optional().describe("Source"),
	severity: z.string().optional().describe("Severity"),
	type: z.string().optional().describe("Type"),
	message: z.string().optional().describe("Message"),
	logcurrent: z.boolean().optional().describe("Log Current"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
});

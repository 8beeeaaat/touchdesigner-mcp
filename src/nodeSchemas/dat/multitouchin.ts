import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const multitouchin = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	outputtype: z.string().optional().describe("Output Type"),
	panel: z.any().optional().describe("Panel"),
	relativeid: z.boolean().optional().describe("Relative ID"),
	relativepos: z.boolean().optional().describe("Relative Position"),
	mouse: z.boolean().optional().describe("Mouse"),
	posthresh: z.number().optional().describe("Position Threshold"),
	contactthresh: z.number().optional().describe("Contact Threshold"),
	minrows: z.number().optional().describe("Min Rows"),
	doubleclickthresh: z.number().optional().describe("Double Click Threshold"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
});

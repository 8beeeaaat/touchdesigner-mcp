import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const keyboardin = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	perform: z.boolean().optional().describe("Perform"),
	keys: z.string().optional().describe("Keys"),
	shortcuts: z.string().optional().describe("Shortcuts"),
	panels: z.any().optional().describe("Panels"),
	lrmodifiers: z.boolean().optional().describe("LR Modifiers"),
	webcodes: z.boolean().optional().describe("Web Codes"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
});

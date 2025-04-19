import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const socketio = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	reset: z.boolean().optional().describe("Reset"),
	url: z.string().optional().describe("URL"),
	verifycert: z.boolean().optional().describe("Verify Certificate"),
	delay: z.number().optional().describe("Delay"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
	bytes: z.boolean().optional().describe("Bytes"),
});

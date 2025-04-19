import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const midiin = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	device: z.string().optional().describe("Device"),
	id: z.string().optional().describe("ID"),
	skipsense: z.boolean().optional().describe("Skip Sense"),
	skiptiming: z.boolean().optional().describe("Skip Timing"),
	filter: z.boolean().optional().describe("Filter"),
	message: z.string().optional().describe("Message"),
	channel: z.string().optional().describe("Channel"),
	index: z.string().optional().describe("Index"),
	value: z.string().optional().describe("Value"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
	bytes: z.boolean().optional().describe("Bytes"),
});

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const oakselect = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	chop: z.any().nullable().optional().describe("CHOP"),
	stream: z.string().optional().describe("Stream"),
	queuesize: z.number().optional().describe("Queue Size"),
	maxitems: z.number().optional().describe("Max Items"),
	outputformat: z.string().optional().describe("Output Format"),
	firstsample: z.boolean().optional().describe("First Sample"),
	rate: z.number().optional().describe("Rate"),
	callbacks: z.string().optional().describe("Callbacks"),
	setuppars: z.boolean().optional().describe("Setup Parameters"),
});

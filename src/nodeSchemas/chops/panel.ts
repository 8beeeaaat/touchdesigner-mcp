import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const panel = createCHOPSchema({
	component: z.string().optional().describe("Component"),
	select: z.string().optional().describe("Select"),
	rename: z.string().optional().describe("Rename"),
	queue: z.boolean().optional().describe("Queue"),
	queuesize: z.number().optional().describe("Queue Size"),
});

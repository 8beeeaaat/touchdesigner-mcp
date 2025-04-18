import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const sequencer = createCHOPSchema({
	datlist: z.string().optional().describe("DAT List"),
	blendscope: z.string().optional().describe("Blend Scope"),
	addscope: z.string().optional().describe("Add Scope"),
	queue: z.string().optional().describe("Queue"),
	trigger: z.boolean().optional().describe("Trigger"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

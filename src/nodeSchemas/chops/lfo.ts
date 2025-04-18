import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const lfo = createCHOPSchema({
	wavetype: z.string().optional().describe("Wave Type"),
	play: z.boolean().optional().describe("Play"),
	frequency: z.number().optional().describe("Frequency"),
	offset: z.number().optional().describe("Offset"),
	amp: z.number().optional().describe("Amplitude"),
	bias: z.number().optional().describe("Bias"),
	phase: z.number().optional().describe("Phase"),
	resetcondition: z.string().optional().describe("Reset Condition"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
	channelname: z.string().optional().describe("Channel Name"),
	rate: z.number().optional().describe("Rate"),
});

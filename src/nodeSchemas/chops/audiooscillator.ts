import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiooscillator CHOP node parameters
 */
export const audiooscillator = createCHOPSchema({
	wavetype: z.string().optional().describe("Wave Type"),
	frequency: z.number().optional().describe("Frequency"),
	octave: z.number().optional().describe("Octave"),
	offset: z.number().optional().describe("Offset"),
	amp: z.number().optional().describe("Amplitude"),
	bias: z.number().optional().describe("Bias"),
	phase: z.number().optional().describe("Phase"),
	smooth: z.boolean().optional().describe("Smooth"),
	resetcondition: z.string().optional().describe("Reset Condition"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
	rate: z.number().optional().describe("Rate"),
});

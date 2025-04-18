import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for beat CHOP node parameters
 */
export const beat = createCHOPSchema({
	op: z.any().optional().describe("Operator"),
	reftimeslice: z.boolean().optional().describe("Reference Time Slice"),
	playmode: z.string().optional().describe("Play Mode"),
	period: z.number().optional().describe("Period"),
	multiples: z.number().optional().describe("Multiples"),
	shiftoffset: z.number().optional().describe("Shift Offset"),
	shiftstep: z.number().optional().describe("Shift Step"),
	randoffset: z.number().optional().describe("Random Offset"),
	randseed: z.number().optional().describe("Random Seed"),
	resetcondition: z.string().optional().describe("Reset Condition"),
	resetbarvalue: z.number().optional().describe("Reset Bar Value"),
	resetwait: z.boolean().optional().describe("Reset Wait"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
	updateglobal: z.boolean().optional().describe("Update Global"),
	ramp: z.boolean().optional().describe("Ramp"),
	pulse: z.boolean().optional().describe("Pulse"),
	sine: z.boolean().optional().describe("Sine"),
	count: z.boolean().optional().describe("Count"),
	countramp: z.boolean().optional().describe("Count Ramp"),
	bar: z.boolean().optional().describe("Bar"),
	beat: z.boolean().optional().describe("Beat"),
	sixteenths: z.boolean().optional().describe("Sixteenths"),
	rampbar: z.boolean().optional().describe("Ramp Bar"),
	rampbeat: z.boolean().optional().describe("Ramp Beat"),
	bpm: z.boolean().optional().describe("BPM"),
});

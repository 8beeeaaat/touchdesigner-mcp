import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for count CHOP node parameters
 */
export const count = createCHOPSchema({
	threshold: z.boolean().optional().describe("Threshold"),
	threshup: z.number().optional().describe("Threshold Up"),
	threshdown: z.number().optional().describe("Threshold Down"),
	retrigger: z.number().optional().describe("Retrigger"),
	retriggerunit: z.string().optional().describe("Retrigger Unit"),
	triggeron: z.string().optional().describe("Trigger On"),
	output: z.string().optional().describe("Output"),
	limitmin: z.number().optional().describe("Limit Min"),
	limitmax: z.number().optional().describe("Limit Max"),
	offtoon: z.string().optional().describe("Off to On"),
	on: z.string().optional().describe("On"),
	ontooff: z.string().optional().describe("On to Off"),
	off: z.string().optional().describe("Off"),
	resetcondition: z.string().optional().describe("Reset Condition"),
	resetvalue: z.number().optional().describe("Reset Value"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

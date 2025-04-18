import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const filter = createCHOPSchema({
	type: z.string().optional().describe("Type"),
	effect: z.number().optional().describe("Effect"),
	width: z.number().optional().describe("Width"),
	widthunit: z.string().optional().describe("Width Unit"),
	spike: z.number().optional().describe("Spike"),
	ramptolerance: z.number().optional().describe("Ramp Tolerance"),
	ramprate: z.number().optional().describe("Ramp Rate"),
	passes: z.number().optional().describe("Passes"),
	filterpersample: z.boolean().optional().describe("Filter Per Sample"),
	cutoff: z.number().optional().describe("Cutoff"),
	speedcoeff: z.number().optional().describe("Speed Coefficient"),
	slopecutoff: z.number().optional().describe("Slope Cutoff"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

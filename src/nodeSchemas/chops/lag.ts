import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const lag = createCHOPSchema({
	lagmethod: z.string().optional().describe("Lag Method"),
	lag1: z.number().optional().describe("Lag 1"),
	lag2: z.number().optional().describe("Lag 2"),
	lagunit: z.string().optional().describe("Lag Unit"),
	overshoot1: z.number().optional().describe("Overshoot 1"),
	overshoot2: z.number().optional().describe("Overshoot 2"),
	overshootunit: z.string().optional().describe("Overshoot Unit"),
	clamp: z.boolean().optional().describe("Clamp"),
	slope1: z.number().optional().describe("Slope 1"),
	slope2: z.number().optional().describe("Slope 2"),
	aclamp: z.boolean().optional().describe("Acceleration Clamp"),
	accel1: z.number().optional().describe("Acceleration 1"),
	accel2: z.number().optional().describe("Acceleration 2"),
	lagsamples: z.boolean().optional().describe("Lag Samples"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const spring = createCHOPSchema({
	springk: z.number().optional().describe("Spring Constant"),
	mass: z.number().optional().describe("Mass"),
	dampingk: z.number().optional().describe("Damping Constant"),
	method: z.string().optional().describe("Method"),
	condfromchan: z.boolean().optional().describe("Condition From Channel"),
	initpos: z.number().optional().describe("Initial Position"),
	initspeed: z.number().optional().describe("Initial Speed"),
	springsamples: z.boolean().optional().describe("Spring Samples"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
});

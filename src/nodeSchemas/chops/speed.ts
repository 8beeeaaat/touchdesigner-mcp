import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const speed = createCHOPSchema({
	order: z.string().optional().describe("Order"),
	constant1: z.number().optional().describe("Constant 1"),
	constant2: z.number().optional().describe("Constant 2"),
	constant3: z.number().optional().describe("Constant 3"),
	limittype: z.string().optional().describe("Limit Type"),
	min: z.number().optional().describe("Minimum"),
	max: z.number().optional().describe("Maximum"),
	speedsamples: z.boolean().optional().describe("Speed Samples"),
	resetcondition: z.string().optional().describe("Reset Condition"),
	resetvalue: z.number().optional().describe("Reset Value"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
	resetonstart: z.boolean().optional().describe("Reset On Start"),
});

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const function_ = createCHOPSchema({
	func: z.string().optional().describe("Function"),
	baseval: z.number().optional().describe("Base Value"),
	expval: z.number().optional().describe("Exponent Value"),
	angunit: z.string().optional().describe("Angle Unit"),
	match: z.string().optional().describe("Match"),
	error: z.string().optional().describe("Error"),
	pinfval: z.number().optional().describe("Positive Infinity Value"),
	ninfval: z.number().optional().describe("Negative Infinity Value"),
	domval: z.number().optional().describe("Domain Value"),
	divval: z.number().optional().describe("Divide Value"),
});

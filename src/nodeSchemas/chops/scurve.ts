import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const scurve = createCHOPSchema({
	type: z.string().optional().describe("Curve Type"),
	length: z.number().optional().describe("Length"),
	prepend: z.number().optional().describe("Prepend"),
	append: z.number().optional().describe("Append"),
	enableremaplength: z.boolean().optional().describe("Enable Remap Length"),
	remaplength: z.number().optional().describe("Remap Length"),
	steepness: z.number().optional().describe("Steepness"),
	linearize: z.number().optional().describe("Linearize"),
	bias: z.number().optional().describe("Bias"),
	fromrange1: z.number().optional().describe("From Range 1"),
	fromrange2: z.number().optional().describe("From Range 2"),
	torange1: z.number().optional().describe("To Range 1"),
	torange2: z.number().optional().describe("To Range 2"),
	channelname: z.string().optional().describe("Channel Name"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});

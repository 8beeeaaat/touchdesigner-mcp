import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const limit = createCHOPSchema({
	type: z.string().optional().describe("Type"),
	min: z.number().optional().describe("Minimum"),
	max: z.number().optional().describe("Maximum"),
	positive: z.boolean().optional().describe("Positive"),
	norm: z.boolean().optional().describe("Normalize"),
	normrange1: z.number().optional().describe("Normalize Range 1"),
	normrange2: z.number().optional().describe("Normalize Range 2"),
	underflow: z.boolean().optional().describe("Underflow"),
	quantvalue: z.string().optional().describe("Quantize Value"),
	vstep: z.number().optional().describe("Value Step"),
	voffset: z.number().optional().describe("Value Offset"),
	quantindex: z.string().optional().describe("Quantize Index"),
	istep: z.number().optional().describe("Index Step"),
	istepunit: z.string().optional().describe("Index Step Unit"),
	ioffset: z.number().optional().describe("Index Offset"),
	ioffsetunit: z.string().optional().describe("Index Offset Unit"),
});

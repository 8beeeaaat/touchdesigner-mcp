import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const lookup = createCHOPSchema({
	index1: z.number().optional().describe("Index 1"),
	index2: z.number().optional().describe("Index 2"),
	cyclic: z.string().optional().describe("Cyclic"),
	chanmatch: z.string().optional().describe("Channel Match"),
	match: z.string().optional().describe("Match"),
	interp: z.boolean().optional().describe("Interpolate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});

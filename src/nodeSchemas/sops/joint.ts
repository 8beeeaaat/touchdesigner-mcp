import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const joint = createSOPSchema({
	group: z.string().optional().describe("Group"),
	divs: z.number().optional().describe("Divisions"),
	preserve1: z.boolean().optional().describe("Preserve 1"),
	preserve2: z.boolean().optional().describe("Preserve 2"),
	orient: z.boolean().optional().describe("Orient"),
	smoothpath: z.boolean().optional().describe("Smooth Path"),
	smoothtwist: z.boolean().optional().describe("Smooth Twist"),
	majoraxes: z.boolean().optional().describe("Major Axes"),
	mintwist: z.boolean().optional().describe("Minimum Twist"),
	lrscale1: z.number().optional().describe("Left/Right Scale 1"),
	lrscale2: z.number().optional().describe("Left/Right Scale 2"),
	lroffset1: z.number().optional().describe("Left/Right Offset 1"),
	lroffset2: z.number().optional().describe("Left/Right Offset 2"),
});

export { joint };

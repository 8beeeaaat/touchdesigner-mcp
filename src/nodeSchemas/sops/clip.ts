import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const clip = createSOPSchema({
	group: z.string().optional().describe("Group"),
	clipop: z.string().optional().describe("Clip Operation"),
	dist: z.number().optional().describe("Distance"),
	dirx: z.number().optional().describe("Direction X"),
	diry: z.number().optional().describe("Direction Y"),
	dirz: z.number().optional().describe("Direction Z"),
	newg: z.boolean().optional().describe("New Group"),
	above: z.string().optional().describe("Above"),
	below: z.string().optional().describe("Below"),
});

export { clip };

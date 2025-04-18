import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const filein = createCHOPSchema({
	file: z.string().optional().describe("File"),
	nameoption: z.string().optional().describe("Name Option"),
	name: z.string().optional().describe("Name"),
	rateoption: z.string().optional().describe("Rate Option"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
	renamefrom: z.string().optional().describe("Rename From"),
	renameto: z.string().optional().describe("Rename To"),
	overridpattern: z.string().optional().describe("Override Pattern"),
	overridevalue: z.number().optional().describe("Override Value"),
	refresh: z.boolean().optional().describe("Refresh"),
	refreshpulse: z.boolean().optional().describe("Refresh Pulse"),
});

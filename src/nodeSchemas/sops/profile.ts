import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const profile = createSOPSchema({
	group: z.string().optional().describe("Group"),
	method: z.string().optional().describe("Method"),
	parametric: z.boolean().optional().describe("Parametric"),
	smooth: z.boolean().optional().describe("Smooth"),
	sdivs: z.number().optional().describe("Subdivisions"),
	tolerance: z.number().optional().describe("Tolerance"),
	order: z.number().optional().describe("Order"),
	csharp: z.boolean().optional().describe("C Sharp"),
	keepsurf: z.boolean().optional().describe("Keep Surface"),
	delprof: z.boolean().optional().describe("Delete Profile"),
	maptype: z.string().optional().describe("Map Type"),
	urange1: z.number().optional().describe("U Range 1"),
	urange2: z.number().optional().describe("U Range 2"),
	vrange1: z.number().optional().describe("V Range 1"),
	vrange2: z.number().optional().describe("V Range 2"),
});

export { profile };

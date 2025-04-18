import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const project = createSOPSchema({
	facegroup: z.string().optional().describe("Face Group"),
	surfgroup: z.string().optional().describe("Surface Group"),
	cycle: z.string().optional().describe("Cycle"),
	method: z.string().optional().describe("Method"),
	axis: z.string().optional().describe("Axis"),
	vector1: z.number().optional().describe("Vector X"),
	vector2: z.number().optional().describe("Vector Y"),
	vector3: z.number().optional().describe("Vector Z"),
	projside: z.string().optional().describe("Project Side"),
	sdivs: z.number().optional().describe("Subdivisions"),
	rtolerance: z.number().optional().describe("R Tolerance"),
	ftolerance: z.number().optional().describe("F Tolerance"),
	uvgap: z.number().optional().describe("UV Gap"),
	order: z.number().optional().describe("Order"),
	csharp: z.boolean().optional().describe("C Sharp"),
	accurate: z.boolean().optional().describe("Accurate"),
	ufrom: z.string().optional().describe("U From"),
	vfrom: z.string().optional().describe("V From"),
	userange: z.boolean().optional().describe("Use Range"),
	urange1: z.number().optional().describe("U Range 1"),
	urange2: z.number().optional().describe("U Range 2"),
	vrange1: z.number().optional().describe("V Range 1"),
	vrange2: z.number().optional().describe("V Range 2"),
	maptype: z.string().optional().describe("Map Type"),
});

export { project };

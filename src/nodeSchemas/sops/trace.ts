import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const trace = createSOPSchema({
	top: z.any().nullable().optional().describe("TOP"),
	thresh: z.number().optional().describe("Threshold"),
	addtexture: z.boolean().optional().describe("Add Texture"),
	delborder: z.boolean().optional().describe("Delete Border"),
	normals: z.boolean().optional().describe("Normals"),
	bordwidth: z.number().optional().describe("Border Width"),
	doresample: z.boolean().optional().describe("Do Resample"),
	step: z.number().optional().describe("Step"),
	dosmooth: z.boolean().optional().describe("Do Smooth"),
	corner: z.number().optional().describe("Corner"),
	fitcurve: z.boolean().optional().describe("Fit Curve"),
	error: z.number().optional().describe("Error"),
	convpoly: z.boolean().optional().describe("Convert Poly"),
	lod: z.number().optional().describe("Level of Detail"),
	hole: z.boolean().optional().describe("Hole"),
});

export { trace };

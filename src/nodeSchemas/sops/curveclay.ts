import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const curveclay = createSOPSchema({
	facegroup: z.string().optional().describe("Face Group"),
	surfgroup: z.string().optional().describe("Surface Group"),
	divs: z.number().optional().describe("Divisions"),
	sharp: z.number().optional().describe("Sharpness"),
	refine: z.number().optional().describe("Refine"),
	projop: z.string().optional().describe("Projection Operation"),
	projdir1: z.number().optional().describe("Projection Direction 1"),
	projdir2: z.number().optional().describe("Projection Direction 2"),
	projdir3: z.number().optional().describe("Projection Direction 3"),
	deformop: z.string().optional().describe("Deform Operation"),
	deformdir1: z.number().optional().describe("Deform Direction 1"),
	deformdir2: z.number().optional().describe("Deform Direction 2"),
	deformdir3: z.number().optional().describe("Deform Direction 3"),
	deformlen: z.number().optional().describe("Deform Length"),
	deforminside: z.boolean().optional().describe("Deform Inside"),
	individual: z.boolean().optional().describe("Individual"),
});

export { curveclay };

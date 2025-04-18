import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const facetrack = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	modelfolder: z.string().optional().describe("Model Folder"),
	meshfile: z.string().optional().describe("Mesh File"),
	top: z.any().nullable().optional().describe("TOP"),
	bbox: z.boolean().optional().describe("Bounding Box"),
	bboxconfidence: z.boolean().optional().describe("Bounding Box Confidence"),
	rotations: z.boolean().optional().describe("Rotations"),
	landmarks: z.string().optional().describe("Landmarks"),
	landmarkconfidence: z.boolean().optional().describe("Landmark Confidence"),
	meshtransform: z.boolean().optional().describe("Mesh Transform"),
	aspectcorrectuv: z.boolean().optional().describe("Aspect Correct UV"),
});

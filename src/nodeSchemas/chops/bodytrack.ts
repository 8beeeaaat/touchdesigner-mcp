import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for bodytrack CHOP node parameters
 */
export const bodytrack = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	modelfolder: z.string().optional().describe("Model Folder"),
	top: z.any().optional().describe("TOP"),
	highperformance: z.boolean().optional().describe("High Performance"),
	bbox: z.boolean().optional().describe("Bounding Box"),
	bboxconfidence: z.boolean().optional().describe("Bounding Box Confidence"),
	keypoints: z.boolean().optional().describe("Keypoints"),
	keypointsconfidence: z.boolean().optional().describe("Keypoints Confidence"),
	rotations: z.boolean().optional().describe("Rotations"),
	body3d: z.boolean().optional().describe("Body 3D"),
	fov: z.number().optional().describe("FOV"),
	aspectcorrectuv: z.boolean().optional().describe("Aspect Correct UV"),
	flipskelu: z.boolean().optional().describe("Flip Skeleton U"),
});

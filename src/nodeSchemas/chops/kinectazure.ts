import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const kinectazure = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	top: z.any().nullable().optional().describe("TOP"),
	maxplayers: z.number().optional().describe("Max Players"),
	relbonerotations: z.boolean().optional().describe("Relative Bone Rotations"),
	absbonerotations: z.boolean().optional().describe("Absolute Bone Rotations"),
	bonelengths: z.boolean().optional().describe("Bone Lengths"),
	worldspace: z.boolean().optional().describe("World Space"),
	colorspace: z.boolean().optional().describe("Color Space"),
	depthspace: z.boolean().optional().describe("Depth Space"),
	aspectcorrectuv: z.boolean().optional().describe("Aspect Correct UV"),
	flipimagev: z.boolean().optional().describe("Flip Image V"),
	flipskelu: z.boolean().optional().describe("Flip Skeleton U"),
	confidence: z.boolean().optional().describe("Confidence"),
	imuchans: z.boolean().optional().describe("IMU Channels"),
});

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const zed = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	camera: z.string().optional().describe("Camera"),
	cameratransform: z.boolean().optional().describe("Camera Transform"),
	resetcameratransform: z
		.boolean()
		.optional()
		.describe("Reset Camera Transform"),
	planeorientation: z.boolean().optional().describe("Plane Orientation"),
	getplane: z.boolean().optional().describe("Get Plane"),
	getplanepulse: z.boolean().optional().describe("Get Plane Pulse"),
	planereferenceframe: z.string().optional().describe("Plane Reference Frame"),
	planepointu: z.number().optional().describe("Plane Point U"),
	planepointv: z.number().optional().describe("Plane Point V"),
	planeposition: z.boolean().optional().describe("Plane Position"),
	planerotation: z.boolean().optional().describe("Plane Rotation"),
	planenormal: z.boolean().optional().describe("Plane Normal"),
	planesize: z.boolean().optional().describe("Plane Size"),
	bodytracking: z.string().optional().describe("Body Tracking"),
	maxbodies: z.number().optional().describe("Max Bodies"),
	body3d: z.boolean().optional().describe("Body 3D"),
	jointmode: z.string().optional().describe("Joint Mode"),
	body2d: z.boolean().optional().describe("Body 2D"),
	aspectcorrectuv: z.boolean().optional().describe("Aspect Correct UV"),
});

import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const rectangle = createSOPSchema({
	orient: z.string().optional().describe("Orient"),
	camera: z.union([z.string(), z.null()]).optional().describe("Camera"),
	cameraz: z.number().optional().describe("Camera Z"),
	cameraaspectx: z.number().optional().describe("Camera Aspect X"),
	cameraaspecty: z.number().optional().describe("Camera Aspect Y"),
	sizex: z.number().optional().describe("Size X"),
	sizey: z.number().optional().describe("Size Y"),
	roundedcorners: z.boolean().optional().describe("Rounded Corners"),
	cornerradius: z.number().optional().describe("Corner Radius"),
	cornersides: z.number().optional().describe("Corner Sides"),
});

export { rectangle };

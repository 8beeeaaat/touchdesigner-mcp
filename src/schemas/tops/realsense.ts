import { z } from "zod";
import { createTOPSchema } from "./index.js";

const realsense = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	stream: z.string().optional(),
	device: z.string().optional(),
	depthscale: z.number().optional(),
	colorstreamcontrol: z.boolean().optional(),
	colorenable: z.boolean().optional(),
	colorformat: z.string().optional(),
	colorwidth: z.number().optional(),
	colorheight: z.number().optional(),
	colorfps: z.number().optional(),
	depthstreamcontrol: z.boolean().optional(),
	depthenable: z.boolean().optional(),
	depthformat: z.string().optional(),
	depthwidth: z.number().optional(),
	depthheight: z.number().optional(),
	depthfps: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { realsense };

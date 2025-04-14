import { z } from "zod";
import { createTOPSchema } from "./index.js";

const kinect = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	device: z.number().optional(),
	coloroutput: z.string().optional(),
	resolution: z.string().optional(),
	aligndepthtocolor: z.boolean().optional(),
	depthwidth: z.number().optional(),
	depthheight: z.number().optional(),
	depthnear: z.number().optional(),
	depthfar: z.number().optional(),
	elevation: z.number().optional(),
	usertracking: z.boolean().optional(),
	resettracking: z.boolean().optional(),
	autostart: z.boolean().optional(),
	starttracking: z.boolean().optional(),
	infraredexposure: z.number().optional(),
	infraredgain: z.number().optional(),
});

export { kinect };

import { z } from "zod";
import { createTOPSchema } from "./index.js";

const kinectazure = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	library: z.string().optional(),
	sensor: z.string().optional(),
	fps: z.string().optional(),
	colorres: z.string().optional(),
	depthmode: z.string().optional(),
	modelpath: z.string().optional(),
	proccessingmode: z.string().optional(),
	gpu: z.number().optional(),
	orientation: z.string().optional(),
	image: z.string().optional(),
	remapimage: z.boolean().optional(),
	bodyimage: z.boolean().optional(),
	mirrorimage: z.boolean().optional(),
	resetcolors: z.boolean().optional(),
	enablecolors: z.boolean().optional(),
	manualexposure: z.boolean().optional(),
	exposure: z.number().optional(),
	manualwhitebalance: z.boolean().optional(),
	whitebalance: z.number().optional(),
	brightness: z.number().optional(),
	contrast: z.number().optional(),
	saturation: z.number().optional(),
	sharpness: z.number().optional(),
	gain: z.number().optional(),
	backlight: z.boolean().optional(),
	powerfreq: z.string().optional(),
	depthdelay: z.number().optional(),
	syncmode: z.string().optional(),
	subdelay: z.number().optional(),
});

export { kinectazure };

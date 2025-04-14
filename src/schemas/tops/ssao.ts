import { z } from "zod";
import { createTOPSchema } from "./index.js";

const ssao = createTOPSchema({
	pageindex: z.number().optional(),
	cameraindex: z.number().optional(),
	quality: z.string().optional(),
	sampledirs: z.number().optional(),
	samplesteps: z.number().optional(),
	surfaceavoid: z.number().optional(),
	ssaopassres: z.string().optional(),
	ssaoradius: z.number().optional(),
	contrast: z.number().optional(),
	attenuation: z.number().optional(),
	edgethresh: z.number().optional(),
	blurradius: z.number().optional(),
	blursharpness: z.number().optional(),
	combinewithcolor: z.boolean().optional(),
});

export { ssao };

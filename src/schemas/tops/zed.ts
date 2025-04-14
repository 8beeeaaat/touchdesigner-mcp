import { z } from "zod";
import { createTOPSchema } from "./index.js";

const zed = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	camera: z.string().optional(),
	perspective: z.string().optional(),
	image: z.string().optional(),
	cameraresolution: z.string().optional(),
	camerafps: z.number().optional(),
	sensingmode: z.string().optional(),
	depthquality: z.string().optional(),
	mindepth: z.number().optional(),
	maxdepth: z.number().optional(),
	toocloseval: z.number().optional(),
	toofarval: z.number().optional(),
	unknownval: z.number().optional(),
	depthstabilization: z.boolean().optional(),
	rerange: z.boolean().optional(),
	referenceframe: z.string().optional(),
	resetcameratransform: z.boolean().optional(),
	mirrorimage: z.boolean().optional(),
});

export { zed };

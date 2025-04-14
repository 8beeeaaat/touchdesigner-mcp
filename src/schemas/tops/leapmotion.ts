import { z } from "zod";
import { createTOPSchema } from "./index.js";

const leapmotion = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	api: z.string().optional(),
	libfolder: z.string().optional(),
	camera: z.string().optional(),
	flipx: z.boolean().optional(),
	flipy: z.boolean().optional(),
	correction: z.boolean().optional(),
	hmd: z.string().optional(),
});

export { leapmotion };

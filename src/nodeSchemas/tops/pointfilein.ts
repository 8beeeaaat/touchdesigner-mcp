import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const pointfilein = createTOPSchema({
	pageindex: z.number().optional(),
	file: z.string().optional(),
	reload: z.boolean().optional(),
	reloadpulse: z.boolean().optional(),
	colorimg: z.boolean().optional(),
	depthimg: z.boolean().optional(),
	normalsimg: z.boolean().optional(),
	pointsize: z.number().optional(),
	decimate: z.boolean().optional(),
	decimatefactor: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { pointfilein };

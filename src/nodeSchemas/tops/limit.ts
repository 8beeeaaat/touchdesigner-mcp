import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const limit = createTOPSchema({
	pageindex: z.number().optional(),
	clamp: z.string().optional(),
	limitmethod: z.string().optional(),
	normalize: z.boolean().optional(),
	hmin: z.number().optional(),
	hmax: z.number().optional(),
	smin: z.number().optional(),
	smax: z.number().optional(),
	vmin: z.number().optional(),
	vmax: z.number().optional(),
	method: z.string().optional(),
});

export { limit };

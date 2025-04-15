import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const opticalflow = createTOPSchema({
	pageindex: z.number().optional(),
	method: z.string().optional(),
	iterations: z.number().optional(),
	levels: z.number().optional(),
	winsize: z.number().optional(),
	prefilter: z.boolean().optional(),
	thresh: z.number().optional(),
	range: z.number().optional(),
	preview: z.string().optional(),
	blendprev: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { opticalflow };

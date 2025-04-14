import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const notch = createTOPSchema({
	pageindex: z.number().optional(),
	notchmodeoverride: z.string().optional(),
	file: z.string().optional(),
	reload: z.boolean().optional(),
	reloadpulse: z.boolean().optional(),
	startfromcurrentframe: z.boolean().optional(),
	parameter: z.string().optional(),
	layer: z.number().optional(),
	exposedvaluesdat: z.any().optional(),
	exposedvaluesreloadpulse: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { notch };

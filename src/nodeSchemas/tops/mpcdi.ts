import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const mpcdi = createTOPSchema({
	pageindex: z.number().optional(),
	calibfile: z.string().optional(),
	reload: z.boolean().optional(),
	reloadpulse: z.boolean().optional(),
	region: z.number().optional(),
	buffer: z.string().optional(),
	pfm: z.boolean().optional(),
	pfm3: z.boolean().optional(),
	pfmmode: z.string().optional(),
	pfm3mode: z.string().optional(),
	alphamode: z.string().optional(),
	mapstyle: z.string().optional(),
	uvmode: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { mpcdi };

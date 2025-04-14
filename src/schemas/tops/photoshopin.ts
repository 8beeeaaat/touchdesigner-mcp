import { z } from "zod";
import { createTOPSchema } from "./index.js";

const photoshopin = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	documentname: z.string().optional(),
	layertype: z.string().optional(),
	indexoffset: z.number().optional(),
	layername: z.string().optional(),
	layerindex: z.number().optional(),
	forcerightside: z.boolean().optional(),
	nativeres: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { photoshopin };

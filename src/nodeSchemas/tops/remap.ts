import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const remap = createTOPSchema({
	pageindex: z.number().optional(),
	mapchannels: z.string().optional(),
	mapinvert: z.boolean().optional(),
	mapscale: z.number().optional(),
	mapbias: z.number().optional(),
	extend: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { remap };

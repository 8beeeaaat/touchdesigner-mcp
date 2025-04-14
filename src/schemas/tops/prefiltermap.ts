import { z } from "zod";
import { createTOPSchema } from "./index.js";

const prefiltermap = createTOPSchema({
	pageindex: z.number().optional(),
	type: z.string().optional(),
	blurwidth: z.number().optional(),
	blurheight: z.number().optional(),
	blendfiltered: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { prefiltermap };

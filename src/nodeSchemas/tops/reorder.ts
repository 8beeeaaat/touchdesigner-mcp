import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const reorder = createTOPSchema({
	pageindex: z.number().optional(),
	r: z.string().optional(),
	g: z.string().optional(),
	b: z.string().optional(),
	a: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { reorder };

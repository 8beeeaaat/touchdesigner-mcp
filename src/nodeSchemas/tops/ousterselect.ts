import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const ousterselect = createTOPSchema({
	pageindex: z.number().optional(),
	parent: z.any().optional(),
	image: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { ousterselect };

import { z } from "zod";
import { createTOPSchema } from "./index.js";

const pointfileselect = createTOPSchema({
	pageindex: z.number().optional(),
	pointfilein: z.any().optional(),
	outputtype: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { pointfileselect };

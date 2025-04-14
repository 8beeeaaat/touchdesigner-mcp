import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const antialias = createTOPSchema({
	pageindex: z.number().optional(),
	quality: z.string().optional(),
	edgedetectsource: z.string().optional(),
	edgethreshold: z.number().optional(),
	maxsearchsteps: z.number().optional(),
	maxdiagsearchsteps: z.number().optional(),
	cornerrounding: z.number().optional(),
	outputedges: z.boolean().optional(),
});

export { antialias };

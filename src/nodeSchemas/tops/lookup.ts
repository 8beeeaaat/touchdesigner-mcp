import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const lookup = createTOPSchema({
	pageindex: z.number().optional(),
	method: z.string().optional(),
	index1: z.number().optional(),
	index2: z.number().optional(),
	channel: z.string().optional(),
	independentalpha: z.boolean().optional(),
	darkuv1: z.number().optional(),
	darkuv2: z.number().optional(),
	darkuvunit: z.string().optional(),
	lightuv1: z.number().optional(),
	lightuv2: z.number().optional(),
	lightuvunit: z.string().optional(),
	chop: z.any().optional(),
	clampchopvalues: z.boolean().optional(),
	displaylookup: z.boolean().optional(),
});

export { lookup };

import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for CHOP COMP node parameters
 */
export const chop = createCOMPSchema({
	choppath: z.union([z.string(), z.null()]).optional(),
	chop: z.union([z.string(), z.null()]).optional(),

	display: z.boolean().optional(),
	enable: z.boolean().optional(),

	index: z.number().optional(),
	cachemode: z.string().optional(),
	timeslice: z.boolean().optional(),
});

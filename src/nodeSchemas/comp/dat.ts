import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for DAT COMP node parameters
 */
export const dat = createCOMPSchema({
	datpath: z.union([z.string(), z.null()]).optional(),
	dat: z.union([z.string(), z.null()]).optional(),

	display: z.boolean().optional(),
	enable: z.boolean().optional(),

	index: z.number().optional(),
	cachemode: z.string().optional(),
	timeslice: z.boolean().optional(),
});

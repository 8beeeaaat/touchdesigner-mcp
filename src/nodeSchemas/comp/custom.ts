import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for custom COMP node parameters
 */
export const custom = createCOMPSchema({
	extensionfile: z.string().optional(),
	extensionclass: z.string().optional(),

	width: z.number().optional(),
	height: z.number().optional(),
	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
});

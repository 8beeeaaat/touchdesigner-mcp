import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for select COMP node parameters
 */
export const select = createCOMPSchema({
	selectpanel: z.union([z.string(), z.null()]).optional(),
	matchsize: z.boolean().optional(),
	followselection: z.boolean().optional(),

	x: z.number().optional(),
	y: z.number().optional(),
	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),

	hmode: z.string().optional(),
	vmode: z.string().optional(),

	display: z.boolean().optional(),
	enable: z.boolean().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),
});

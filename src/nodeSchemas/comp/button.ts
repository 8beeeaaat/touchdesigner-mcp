import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for button COMP node parameters
 */
export const button = createCOMPSchema({
	label: z.string().optional(),
	value0: z.boolean().optional(),
	buttontype: z.string().optional(),
	buttongroup: z.string().optional(),
	buttongroupdat: z.union([z.string(), z.null()]).optional(),

	colorr: z.number().optional(),
	colorg: z.number().optional(),
	colorb: z.number().optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),

	hmode: z.string().optional(),
	vmode: z.string().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),

	display: z.boolean().optional(),
	enable: z.boolean().optional(),
});

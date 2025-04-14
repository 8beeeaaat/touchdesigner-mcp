import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for list COMP node parameters
 */
export const list = createCOMPSchema({
	callbacks: z.string().optional(),
	rows: z.number().optional(),
	cols: z.number().optional(),
	lockfirstrow: z.boolean().optional(),
	lockfirstcol: z.boolean().optional(),
	hscrollbar: z.boolean().optional(),
	vscrollbar: z.boolean().optional(),
	offcellcallbacks: z.boolean().optional(),
	reset: z.boolean().optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),
	hmode: z.string().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),

	phscrollbar: z.string().optional(),
	pvscrollbar: z.string().optional(),
	scrollbarthickness: z.number().optional(),
	scrolloverlay: z.string().optional(),
});

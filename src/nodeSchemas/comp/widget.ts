import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for widget COMP node parameters
 */
export const widget = createCOMPSchema({
	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),

	hmode: z.string().optional(),
	leftanchor: z.number().optional(),
	leftoffset: z.number().optional(),
	rightanchor: z.number().optional(),
	rightoffset: z.number().optional(),
	horigin: z.number().optional(),
	hfillweight: z.number().optional(),
	vmode: z.string().optional(),
	bottomanchor: z.number().optional(),
	bottomoffset: z.number().optional(),
	topanchor: z.number().optional(),
	topoffset: z.number().optional(),
	vorigin: z.number().optional(),
	vfillweight: z.number().optional(),

	display: z.boolean().optional(),
	enable: z.boolean().optional(),
	cursor: z.string().optional(),
	clickthrough: z.boolean().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),

	leftborder: z.string().optional(),
	rightborder: z.string().optional(),
	bottomborder: z.string().optional(),
	topborder: z.string().optional(),

	crop: z.string().optional(),
	phscrollbar: z.string().optional(),
	pvscrollbar: z.string().optional(),
	scrollbarthickness: z.number().optional(),
	scrolloverlay: z.string().optional(),

	drag: z.string().optional(),
	dragscript: z.string().optional(),
	drop: z.string().optional(),
	dropscript: z.string().optional(),
});

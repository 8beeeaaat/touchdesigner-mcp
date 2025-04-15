import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for parameter COMP node parameters
 */
export const parameter = createCOMPSchema({
	op: z.string().optional(),
	header: z.boolean().optional(),
	pagenames: z.boolean().optional(),
	separators: z.boolean().optional(),
	inputeditor: z.boolean().optional(),
	allowexpand: z.boolean().optional(),
	builtin: z.boolean().optional(),
	custom: z.boolean().optional(),

	combinescopes: z.string().optional(),
	pagescope: z.string().optional(),
	parscope: z.string().optional(),
	syncpage: z.boolean().optional(),
	scopeorder: z.boolean().optional(),
	compress: z.number().optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),

	hmode: z.string().optional(),
	leftanchor: z.number().optional(),
	rightanchor: z.number().optional(),
	vmode: z.string().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),

	crop: z.string().optional(),
	phscrollbar: z.string().optional(),
	pvscrollbar: z.string().optional(),
	scrollbarthickness: z.number().optional(),
});

import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for opviewer COMP node parameters
 */
export const opviewer = createCOMPSchema({
	opviewer: z.union([z.string(), z.null()]).optional(),
	interactive: z.boolean().optional(),
	opcenterx: z.number().optional(),
	opcentery: z.number().optional(),
	opcenterunit: z.string().optional(),
	opscale: z.number().optional(),
	topdirect: z.boolean().optional(),
	contentsize: z.boolean().optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),

	hmode: z.string().optional(),
	leftanchor: z.number().optional(),
	rightanchor: z.number().optional(),
	vmode: z.string().optional(),
	bottomanchor: z.number().optional(),
	topanchor: z.number().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),

	phscrollbar: z.string().optional(),
	pvscrollbar: z.string().optional(),
	scrollbarthickness: z.number().optional(),
});

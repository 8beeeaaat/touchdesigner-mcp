import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for container COMP node parameters
 */
export const container = createCOMPSchema({
	x: z.number().optional(),
	y: z.number().optional(),
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

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),

	multrgb: z.boolean().optional(),
	composite: z.string().optional(),
	opacity: z.number().optional(),

	align: z.string().optional(),
	spacing: z.number().optional(),
	justifymethod: z.string().optional(),
	justifyh: z.string().optional(),
	justifyv: z.string().optional(),
});

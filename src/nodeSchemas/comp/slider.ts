import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for slider COMP node parameters
 */
export const slider = createCOMPSchema({
	label: z.string().optional(),
	slidertype: z.string().optional(),
	value0: z.number().optional(),
	value1: z.number().optional(),

	zonel: z.number().optional(),
	zoner: z.number().optional(),
	zoneb: z.number().optional(),
	zonet: z.number().optional(),
	clampul: z.boolean().optional(),
	clampuh: z.boolean().optional(),
	clampvl: z.boolean().optional(),
	clampvh: z.boolean().optional(),

	colorr: z.number().optional(),
	colorg: z.number().optional(),
	colorb: z.number().optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),

	display: z.boolean().optional(),
	enable: z.boolean().optional(),
	cursor: z.string().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),

	leftborder: z.string().optional(),
	rightborder: z.string().optional(),
	bottomborder: z.string().optional(),
	topborder: z.string().optional(),
});

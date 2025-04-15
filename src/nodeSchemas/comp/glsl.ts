import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for GLSL COMP node parameters
 */
export const glsl = createCOMPSchema({
	vertexdat: z.union([z.string(), z.null()]).optional(),
	pixeldat: z.string().optional(),

	sampler: z.number().optional(),
	sampler0name: z.string().optional(),
	sampler0top: z.union([z.string(), z.null()]).optional(),
	sampler0extendu: z.string().optional(),
	sampler0extendv: z.string().optional(),
	sampler0extendw: z.string().optional(),
	sampler0filter: z.string().optional(),
	sampler0anisotropy: z.string().optional(),

	vec: z.number().optional(),
	vec0name: z.string().optional(),
	vec0valuex: z.number().optional(),
	vec0valuey: z.number().optional(),
	vec0valuez: z.number().optional(),
	vec0valuew: z.number().optional(),

	const: z.number().optional(),
	const0name: z.string().optional(),
	const0value: z.number().optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),
});

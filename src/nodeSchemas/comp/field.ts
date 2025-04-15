import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for field COMP node parameters
 */
export const field = createCOMPSchema({
	fieldtype: z.string().optional(),
	fieldformatnumbers: z.boolean().optional(),
	fielddigits: z.number().optional(),
	fielddecimal: z.number().optional(),
	fieldzeroes: z.boolean().optional(),
	fieldleadzero: z.boolean().optional(),

	fieldlock: z.boolean().optional(),
	fieldexpand: z.boolean().optional(),
	fieldprotected: z.boolean().optional(),
	fieldconspaces: z.boolean().optional(),
	fieldmultiline: z.boolean().optional(),
	fieldnoshift: z.boolean().optional(),
	fieldcursor: z.boolean().optional(),
	fieldfocus: z.union([z.string(), z.null()]).optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	hmode: z.string().optional(),
	leftanchor: z.number().optional(),
	rightanchor: z.number().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),
});

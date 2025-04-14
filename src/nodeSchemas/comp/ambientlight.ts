import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for ambientlight COMP node parameters
 */
export const ambientlight = createCOMPSchema({
	cr: z.number().optional(),
	cg: z.number().optional(),
	cb: z.number().optional(),
	dimmer: z.number().optional(),

	render: z.boolean().optional(),
	material: z.union([z.string(), z.null()]).optional(),

	wcolorr: z.number().optional(),
	wcolorg: z.number().optional(),
	wcolorb: z.number().optional(),

	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	rx: z.number().optional(),
	ry: z.number().optional(),
	rz: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	sz: z.number().optional(),
});

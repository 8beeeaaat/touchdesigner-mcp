import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for handle COMP node parameters
 */
export const handle = createCOMPSchema({
	target: z.union([z.string(), z.null()]).optional(),
	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	weight: z.number().optional(),
	twistonly: z.boolean().optional(),
	falloff: z.number().optional(),

	dorxlimit: z.boolean().optional(),
	lrxmin: z.number().optional(),
	lrxmax: z.number().optional(),
	dorylimit: z.boolean().optional(),
	lrymin: z.number().optional(),
	lrymax: z.number().optional(),
	dorzlimit: z.boolean().optional(),
	lrzmin: z.number().optional(),
	lrzmax: z.number().optional(),

	material: z.union([z.string(), z.null()]).optional(),
	render: z.boolean().optional(),
	drawpriority: z.number().optional(),
	pickpriority: z.number().optional(),

	wcolorr: z.number().optional(),
	wcolorg: z.number().optional(),
	wcolorb: z.number().optional(),
});

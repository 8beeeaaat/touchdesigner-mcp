import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for null COMP node parameters
 */
export const nullNode = createCOMPSchema({
	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	rx: z.number().optional(),
	ry: z.number().optional(),
	rz: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	sz: z.number().optional(),

	parentxformsrc: z.string().optional(),
	parentobject: z.union([z.string(), z.null()]).optional(),

	material: z.union([z.string(), z.null()]).optional(),
	render: z.boolean().optional(),
	drawpriority: z.number().optional(),
	pickpriority: z.number().optional(),

	wcolorr: z.number().optional(),
	wcolorg: z.number().optional(),
	wcolorb: z.number().optional(),

	instancing: z.boolean().optional(),
	instancecountmode: z.string().optional(),
	numinstances: z.number().optional(),
});

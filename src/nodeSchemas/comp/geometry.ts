import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for geometry COMP node parameters
 */
export const geometry = createCOMPSchema({
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

	lookat: z.union([z.string(), z.null()]).optional(),
	forwarddir: z.string().optional(),
	lookup: z.string().optional(),

	material: z.union([z.string(), z.null()]).optional(),
	render: z.boolean().optional(),
	drawpriority: z.number().optional(),
	pickpriority: z.number().optional(),

	instancing: z.boolean().optional(),
	instancecountmode: z.string().optional(),
	numinstances: z.number().optional(),
});

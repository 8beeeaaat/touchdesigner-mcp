import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for SOP COMP node parameters
 */
export const sop = createCOMPSchema({
	soppath: z.union([z.string(), z.null()]).optional(),
	rendersop: z.boolean().optional(),

	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	rx: z.number().optional(),
	ry: z.number().optional(),
	rz: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	sz: z.number().optional(),

	material: z.union([z.string(), z.null()]).optional(),
	render: z.boolean().optional(),

	wireframe: z.boolean().optional(),
	displaypoints: z.boolean().optional(),

	wcolorr: z.number().optional(),
	wcolorg: z.number().optional(),
	wcolorb: z.number().optional(),
});

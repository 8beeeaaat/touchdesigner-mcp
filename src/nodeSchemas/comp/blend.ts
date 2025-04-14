import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for blend COMP node parameters
 */
export const blend = createCOMPSchema({
	parenttype: z.string().optional(),
	sequence: z.number().optional(),
	reset: z.number().optional(),

	blendw1: z.number().optional(),
	blendm1: z.number().optional(),
	blendw2: z.number().optional(),
	blendm2: z.number().optional(),
	blendw3: z.number().optional(),
	blendm3: z.number().optional(),
	blendw4: z.number().optional(),
	blendm4: z.number().optional(),

	noffset: z.number().optional(),
	axesorient: z.boolean().optional(),
	shortrot: z.boolean().optional(),

	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	rx: z.number().optional(),
	ry: z.number().optional(),
	rz: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	sz: z.number().optional(),

	render: z.boolean().optional(),
	material: z.union([z.string(), z.null()]).optional(),
});

import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for actor COMP node parameters
 */
export const actor = createCOMPSchema({
	initialize: z.boolean().optional(),
	active: z.boolean().optional(),
	kinstate: z.string().optional(),
	sops: z.union([z.string(), z.null()]).optional(),
	shape: z.string().optional(),
	elltol: z.number().optional(),
	infinitemass: z.boolean().optional(),
	mass: z.number().optional(),

	linvelx: z.number().optional(),
	linvely: z.number().optional(),
	linvelz: z.number().optional(),
	angvelx: z.number().optional(),
	angvely: z.number().optional(),
	angvelz: z.number().optional(),

	forces: z.union([z.string(), z.null()]).optional(),
	globalgrav: z.boolean().optional(),
	gravityx: z.number().optional(),
	gravityy: z.number().optional(),
	gravityz: z.number().optional(),
	friction: z.number().optional(),
	rollfric: z.number().optional(),
	rest: z.number().optional(),

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
	wcolorr: z.number().optional(),
	wcolorg: z.number().optional(),
	wcolorb: z.number().optional(),
});

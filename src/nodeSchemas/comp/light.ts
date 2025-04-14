import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for light COMP node parameters
 */
export const light = createCOMPSchema({
	cr: z.number().optional(),
	cg: z.number().optional(),
	cb: z.number().optional(),
	dimmer: z.number().optional(),

	lighttype: z.string().optional(),
	coneangle: z.number().optional(),
	conedelta: z.number().optional(),
	coneroll: z.number().optional(),

	attenuated: z.boolean().optional(),
	attenuationstart: z.number().optional(),
	attenuationend: z.number().optional(),
	attenuationexp: z.number().optional(),

	projmaptype: z.string().optional(),
	projmap: z.union([z.string(), z.null()]).optional(),
	projmapextendu: z.string().optional(),
	projmapextendv: z.string().optional(),
	projmapextendw: z.string().optional(),
	projmapfilter: z.string().optional(),
	projmapmode: z.string().optional(),
	projangle: z.number().optional(),

	shadowtype: z.string().optional(),
	shadowcasters: z.union([z.string(), z.null()]).optional(),
	lightsize1: z.number().optional(),
	lightsize2: z.number().optional(),
	maxshadowsoftness: z.number().optional(),
	filtersamples: z.number().optional(),
	searchsteps: z.number().optional(),
	shadowresolution1: z.number().optional(),
	shadowresolution2: z.number().optional(),
	shadowmap: z.union([z.string(), z.null()]).optional(),

	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	rx: z.number().optional(),
	ry: z.number().optional(),
	rz: z.number().optional(),
});

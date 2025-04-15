import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for environmentlight COMP node parameters
 */
export const environmentlight = createCOMPSchema({
	cr: z.number().optional(),
	cg: z.number().optional(),
	cb: z.number().optional(),
	dimmer: z.number().optional(),

	envlightmap: z.union([z.string(), z.null()]).optional(),
	envlightmaptype2d: z.string().optional(),
	envlightmapquality: z.number().optional(),
	envlightmaprotatex: z.number().optional(),
	envlightmaprotatey: z.number().optional(),
	envlightmaprotatez: z.number().optional(),
	envlightmapprefilter: z.string().optional(),
	envlightspecmap: z.union([z.string(), z.null()]).optional(),

	render: z.boolean().optional(),
	material: z.union([z.string(), z.null()]).optional(),
	drawpriority: z.number().optional(),
	pickpriority: z.number().optional(),

	wcolorr: z.number().optional(),
	wcolorg: z.number().optional(),
	wcolorb: z.number().optional(),

	fog: z.string().optional(),
	fogdensity: z.number().optional(),
	fognear: z.number().optional(),
	fogfar: z.number().optional(),
	fogcolorr: z.number().optional(),
	fogcolorg: z.number().optional(),
	fogcolorb: z.number().optional(),
	fogalpha: z.number().optional(),
});

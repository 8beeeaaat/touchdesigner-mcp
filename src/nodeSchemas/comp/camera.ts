import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for camera COMP node parameters
 */
export const camera = createCOMPSchema({
	projection: z.string().optional(),
	projectionblend: z.number().optional(),
	orthoorigin: z.string().optional(),
	orthowidth: z.number().optional(),
	viewanglemethod: z.string().optional(),
	fov: z.number().optional(),
	focal: z.number().optional(),
	aperture: z.number().optional(),

	near: z.number().optional(),
	far: z.number().optional(),

	winrollpivot: z.string().optional(),
	winx: z.number().optional(),
	winy: z.number().optional(),
	winsize: z.number().optional(),
	winroll: z.number().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgcolora: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
	fog: z.string().optional(),
	fogdensity: z.number().optional(),
	fognear: z.number().optional(),
	fogfar: z.number().optional(),
	fogcolorr: z.number().optional(),
	fogcolorg: z.number().optional(),
	fogcolorb: z.number().optional(),
	fogalpha: z.number().optional(),

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

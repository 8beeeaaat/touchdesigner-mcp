import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for camerablend COMP node parameters
 */
export const camerablend = createCOMPSchema({
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

	bgcolorw: z.number().optional(),
	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgcolora: z.number().optional(),
	fogw: z.number().optional(),
	fog: z.string().optional(),
	fogdensity: z.number().optional(),
	fogcolorr: z.number().optional(),
	fogcolorg: z.number().optional(),
	fogcolorb: z.number().optional(),

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

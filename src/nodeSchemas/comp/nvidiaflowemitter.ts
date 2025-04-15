import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for nvidiaflowemitter COMP node parameters
 */
export const nvidiaflowemitter = createCOMPSchema({
	active: z.boolean().optional(),
	rate: z.number().optional(),
	lifetime: z.number().optional(),

	temperature: z.number().optional(),
	density: z.number().optional(),
	buoyancy: z.number().optional(),
	speed: z.number().optional(),

	viscosity: z.number().optional(),
	color: z.string().optional(),
	opacity: z.number().optional(),

	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	sz: z.number().optional(),
});

import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for bulletsolver COMP node parameters
 */
export const bulletsolver = createCOMPSchema({
	actors: z.array(z.string()).optional(),
	forces: z.union([z.string(), z.null()]).optional(),
	gravityx: z.number().optional(),
	gravityy: z.number().optional(),
	gravityz: z.number().optional(),
	dimension: z.string().optional(),

	linmultx: z.number().optional(),
	linmulty: z.number().optional(),
	linmultz: z.number().optional(),
	angmultx: z.number().optional(),
	angmulty: z.number().optional(),
	angmultz: z.number().optional(),

	initall: z.boolean().optional(),
	initialize: z.boolean().optional(),
	start: z.boolean().optional(),
	play: z.boolean().optional(),
	rate: z.number().optional(),
	simspeed: z.number().optional(),

	feedback: z.union([z.string(), z.null()]).optional(),
	contacttest: z.boolean().optional(),
	alwayssim: z.boolean().optional(),
	callbacks: z.string().optional(),

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

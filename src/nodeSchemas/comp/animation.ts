import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for animation COMP node parameters
 */
export const animation = createCOMPSchema({
	timeref: z.string().optional(),
	channels: z.string().optional(),

	playmode: z.string().optional(),
	play: z.boolean().optional(),
	speed: z.number().optional(),
	cue: z.boolean().optional(),
	cuepulse: z.boolean().optional(),
	cuepoint: z.number().optional(),
	cuepointunit: z.string().optional(),

	cyclic: z.string().optional(),
	rangetype: z.string().optional(),
	start: z.number().optional(),
	startunit: z.string().optional(),
	end: z.number().optional(),
	endunit: z.string().optional(),

	tleft: z.string().optional(),
	tright: z.string().optional(),
	tdefault: z.number().optional(),
});

import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for fbx COMP node parameters
 */
export const fbx = createCOMPSchema({
	file: z.string().optional(),
	importmethod: z.string().optional(),
	imp: z.boolean().optional(),
	importscale: z.number().optional(),
	texdir: z.string().optional(),

	lights: z.boolean().optional(),
	cameras: z.boolean().optional(),
	genactors: z.boolean().optional(),
	mergegeo: z.boolean().optional(),
	mergelevel: z.number().optional(),
	primgroups: z.boolean().optional(),
	maxwiredchildren: z.number().optional(),
	gpudirect: z.boolean().optional(),
	keepparams: z.boolean().optional(),
	keepconnections: z.boolean().optional(),

	animation: z.string().optional(),
	shiftanimationstart: z.boolean().optional(),
	sampleratemode: z.string().optional(),
	samplerate: z.number().optional(),
	playmode: z.string().optional(),
	initialize: z.boolean().optional(),
	start: z.boolean().optional(),
	play: z.boolean().optional(),
	speed: z.number().optional(),

	cue: z.boolean().optional(),
	cuepulse: z.boolean().optional(),
	cuepoint: z.number().optional(),
	cuepointunit: z.string().optional(),
	index: z.number().optional(),
	indexunit: z.string().optional(),

	trim: z.boolean().optional(),
	tstart: z.number().optional(),
	tstartunit: z.string().optional(),
	tend: z.number().optional(),
	tendunit: z.string().optional(),
	textendleft: z.string().optional(),
	textendright: z.string().optional(),
});

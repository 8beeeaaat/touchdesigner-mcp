import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for engine COMP node parameters
 */
export const engine = createCOMPSchema({
	file: z.string().optional(),
	unload: z.boolean().optional(),
	reload: z.boolean().optional(),
	reloadoncrash: z.boolean().optional(),
	assetpaths: z.string().optional(),
	callbacks: z.string().optional(),

	clock: z.string().optional(),
	matchrate: z.boolean().optional(),
	fps: z.number().optional(),
	wait: z.boolean().optional(),
	timeout: z.number().optional(),

	inauto: z.boolean().optional(),
	inframes: z.number().optional(),
	outauto: z.boolean().optional(),
	outframes: z.number().optional(),
	preroll: z.number().optional(),
	prerollunits: z.string().optional(),

	readywhen: z.string().optional(),
	startoninit: z.boolean().optional(),
	initialize: z.boolean().optional(),
	start: z.boolean().optional(),
	play: z.boolean().optional(),
	gotodone: z.boolean().optional(),
	ondone: z.string().optional(),
	oncompcreate: z.string().optional(),
	launch: z.boolean().optional(),
	quit: z.boolean().optional(),
});

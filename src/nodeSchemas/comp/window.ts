import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for window COMP node parameters
 */
export const window = createCOMPSchema({
	winop: z.union([z.string(), z.null()]).optional(),
	title: z.string().optional(),

	justifyoffsetto: z.string().optional(),
	monitor: z.number().optional(),
	justifyh: z.string().optional(),
	justifyv: z.string().optional(),
	winoffsetx: z.number().optional(),
	winoffsety: z.number().optional(),

	single: z.string().optional(),
	dpiscaling: z.string().optional(),
	size: z.string().optional(),
	winw: z.number().optional(),
	winh: z.number().optional(),

	borders: z.boolean().optional(),
	bordersinsize: z.boolean().optional(),
	alwaysontop: z.boolean().optional(),

	cursorvisible: z.string().optional(),
	constraincursor: z.string().optional(),
	cursormonitor: z.number().optional(),

	closeescape: z.boolean().optional(),
	interact: z.boolean().optional(),
	allowminimize: z.boolean().optional(),
	vsyncmode: z.string().optional(),

	drawwindow: z.boolean().optional(),
	hwframelock: z.boolean().optional(),
	openglstereo: z.boolean().optional(),

	winopen: z.boolean().optional(),
	winclose: z.boolean().optional(),
});

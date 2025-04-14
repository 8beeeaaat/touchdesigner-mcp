import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for base COMP node parameters
 */
export const base = createCOMPSchema({
	ext: z.number().optional(),
	ext0object: z.string().optional(),
	ext0name: z.string().optional(),
	ext0promote: z.boolean().optional(),
	reinitextensions: z.boolean().optional(),

	parentshortcut: z.string().optional(),
	opshortcut: z.string().optional(),

	iop: z.number().optional(),
	iop0shortcut: z.string().optional(),
	iop0op: z.union([z.string(), z.null()]).optional(),
	opviewer: z.union([z.string(), z.null()]).optional(),

	enablecloning: z.boolean().optional(),
	enablecloningpulse: z.boolean().optional(),
	clone: z.union([z.string(), z.null()]).optional(),
	loadondemand: z.boolean().optional(),

	enableexternaltox: z.boolean().optional(),
	enableexternaltoxpulse: z.boolean().optional(),
	externaltox: z.string().optional(),
	reloadcustom: z.boolean().optional(),
	reloadbuiltin: z.boolean().optional(),
	savebackup: z.boolean().optional(),

	subcompname: z.string().optional(),
	relpath: z.string().optional(),
});

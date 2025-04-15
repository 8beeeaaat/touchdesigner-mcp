import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for replicator COMP node parameters
 */
export const replicator = createCOMPSchema({
	method: z.string().optional(),
	numreplicants: z.number().optional(),
	repsuffixstart: z.number().optional(),
	template: z.union([z.string(), z.null()]).optional(),

	namefromtable: z.string().optional(),
	ignorefirstrow: z.boolean().optional(),
	colname: z.string().optional(),
	colindex: z.number().optional(),

	opprefix: z.string().optional(),
	master: z.union([z.string(), z.null()]).optional(),
	destination: z.string().optional(),

	domaxops: z.boolean().optional(),
	maxops: z.number().optional(),

	tscript: z.string().optional(),
	callbacks: z.string().optional(),

	layout: z.string().optional(),
	layoutorigin1: z.number().optional(),
	layoutorigin2: z.number().optional(),

	doincremental: z.boolean().optional(),
	increment: z.number().optional(),
	recreateall: z.boolean().optional(),
	recreatemissing: z.boolean().optional(),
});

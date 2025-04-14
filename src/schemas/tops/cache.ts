import { z } from "zod";
import { createTOPSchema } from "./index.js";

const cache = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	activepulse: z.boolean().optional(),
	cacheonce: z.boolean().optional(),
	replace: z.boolean().optional(),
	replacespulse: z.boolean().optional(),
	replaceindex: z.number().optional(),
	prefill: z.boolean().optional(),
	prefillpulse: z.boolean().optional(),
	cachesize: z.number().optional(),
	step: z.number().optional(),
	outputindex: z.number().optional(),
	outputindexunit: z.string().optional(),
	interp: z.boolean().optional(),
	alwayscook: z.boolean().optional(),
	reset: z.boolean().optional(),
	resetpulse: z.boolean().optional(),
});

export { cache };

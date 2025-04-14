import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const texture3d = createTOPSchema({
	pageindex: z.number().optional(),
	type: z.string().optional(),
	active: z.boolean().optional(),
	replacesingle: z.boolean().optional(),
	replacesinglepulse: z.boolean().optional(),
	replaceindex: z.number().optional(),
	prefill: z.boolean().optional(),
	prefillpulse: z.boolean().optional(),
	cachesize: z.number().optional(),
	step: z.number().optional(),
	reset: z.boolean().optional(),
	resetpulse: z.boolean().optional(),
});

export { texture3d };

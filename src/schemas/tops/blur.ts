import { z } from "zod";
import { createTOPSchema } from "./index.js";

const blur = createTOPSchema({
	pageindex: z.number().optional(),
	method: z.string().optional(),
	type: z.string().optional(),
	extend: z.string().optional(),
	preshrink: z.number().optional(),
	size: z.number().optional(),
	offsetx: z.number().optional(),
	offsety: z.number().optional(),
	offsetunit: z.string().optional(),
	rotate: z.number().optional(),
	dither: z.boolean().optional(),
});

export { blur };

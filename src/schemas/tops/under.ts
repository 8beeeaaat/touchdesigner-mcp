import { z } from "zod";
import { createTOPSchema } from "./index.js";

const under = createTOPSchema({
	pageindex: z.number().optional(),
	size: z.string().optional(),
	prefit: z.string().optional(),
	justifyh: z.string().optional(),
	justifyv: z.string().optional(),
	extend: z.string().optional(),
	r: z.number().optional(),
	tx: z.number().optional(),
	ty: z.number().optional(),
	tunit: z.string().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	px: z.number().optional(),
	py: z.number().optional(),
	punit: z.string().optional(),
	legacyxform: z.boolean().optional(),
});

export { under };

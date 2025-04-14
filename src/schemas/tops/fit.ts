import { z } from "zod";
import { createTOPSchema } from "./index.js";

const fit = createTOPSchema({
	pageindex: z.number().optional(),
	fit: z.string().optional(),
	xord: z.string().optional(),
	tx: z.number().optional(),
	ty: z.number().optional(),
	tunit: z.string().optional(),
	r: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	px: z.number().optional(),
	py: z.number().optional(),
	punit: z.string().optional(),
	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgcolora: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
	legacyxform: z.boolean().optional(),
});

export { fit };

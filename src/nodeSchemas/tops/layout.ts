import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const layout = createTOPSchema({
	pageindex: z.number().optional(),
	tops: z.any().optional(),
	scaleres: z.boolean().optional(),
	align: z.string().optional(),
	fit: z.string().optional(),
	maxrows: z.number().optional(),
	maxcols: z.number().optional(),
	bcolorr: z.number().optional(),
	bcolorg: z.number().optional(),
	bcolorb: z.number().optional(),
	bcolora: z.number().optional(),
	borderl: z.number().optional(),
	borderr: z.number().optional(),
	borderb: z.number().optional(),
	bordert: z.number().optional(),
	bunit: z.string().optional(),
	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgcolora: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
	compover: z.boolean().optional(),
	xord: z.string().optional(),
	tx: z.number().optional(),
	ty: z.number().optional(),
	tunit: z.string().optional(),
	rotate: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	legacyxform: z.boolean().optional(),
});

export { layout };

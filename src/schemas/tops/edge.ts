import { z } from "zod";
import { createTOPSchema } from "./index.js";

const edge = createTOPSchema({
	pageindex: z.number().optional(),
	select: z.string().optional(),
	blacklevel: z.number().optional(),
	strength: z.number().optional(),
	offset1: z.number().optional(),
	offset2: z.number().optional(),
	offsetunit: z.string().optional(),
	edgecolorr: z.number().optional(),
	edgecolorg: z.number().optional(),
	edgecolorb: z.number().optional(),
	edgecolora: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
	alphaoutputmenu: z.string().optional(),
	compinput: z.boolean().optional(),
});

export { edge };

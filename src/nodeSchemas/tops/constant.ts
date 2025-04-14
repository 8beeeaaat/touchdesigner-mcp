import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const constant = createTOPSchema({
	pageindex: z.number().optional(),
	colorr: z.number().optional(),
	colorg: z.number().optional(),
	colorb: z.number().optional(),
	alpha: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
	rgbaunit: z.string().optional(),
	combineinput: z.string().optional(),
	operand: z.string().optional(),
	swaporder: z.boolean().optional(),
});

export { constant };

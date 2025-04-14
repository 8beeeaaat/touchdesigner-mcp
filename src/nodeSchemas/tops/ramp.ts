import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const ramp = createTOPSchema({
	pageindex: z.number().optional(),
	type: z.string().optional(),
	ramp: z.string().optional(),
	basis: z.string().optional(),
	interp: z.string().optional(),
	start1: z.number().optional(),
	start2: z.number().optional(),
	end1: z.number().optional(),
	end2: z.number().optional(),
	startunit: z.string().optional(),
	endunit: z.string().optional(),
	center1: z.number().optional(),
	center2: z.number().optional(),
	centerunit: z.string().optional(),
	steps: z.number().optional(),
	mono: z.boolean().optional(),
	color1r: z.number().optional(),
	color1g: z.number().optional(),
	color1b: z.number().optional(),
	color1a: z.number().optional(),
	color2r: z.number().optional(),
	color2g: z.number().optional(),
	color2b: z.number().optional(),
	color2a: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
});

export { ramp };

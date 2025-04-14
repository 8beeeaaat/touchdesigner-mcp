import { z } from "zod";
import { createTOPSchema } from "./index.js";

const lumalevel = createTOPSchema({
	pageindex: z.number().optional(),
	input: z.number().optional(),
	invertluma: z.boolean().optional(),
	inputluma: z.number().optional(),
	lumalimitlow: z.number().optional(),
	lumalimithigh: z.number().optional(),
	gamma: z.number().optional(),
	output: z.number().optional(),
	blacklevel: z.number().optional(),
	brightness: z.number().optional(),
	contrast: z.number().optional(),
	inlow: z.number().optional(),
	inhigh: z.number().optional(),
	outlow: z.number().optional(),
	outhigh: z.number().optional(),
});

export { lumalevel };

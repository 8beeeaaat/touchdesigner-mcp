import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const emboss = createTOPSchema({
	pageindex: z.number().optional(),
	select: z.string().optional(),
	method: z.string().optional(),
	midpoint: z.number().optional(),
	strength: z.number().optional(),
	offset1: z.number().optional(),
	offset2: z.number().optional(),
	offsetunit: z.string().optional(),
	direction: z.number().optional(),
});

export { emboss };

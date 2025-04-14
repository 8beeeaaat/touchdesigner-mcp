import { z } from "zod";
import { createTOPSchema } from "./index.js";

const slope = createTOPSchema({
	pageindex: z.number().optional(),
	red: z.string().optional(),
	green: z.string().optional(),
	blue: z.string().optional(),
	alpha: z.string().optional(),
	method: z.string().optional(),
	zeropoint: z.number().optional(),
	strength: z.number().optional(),
	offset1: z.number().optional(),
	offset2: z.number().optional(),
	offsetunit: z.string().optional(),
});

export { slope };

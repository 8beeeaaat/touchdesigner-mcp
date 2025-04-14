import { z } from "zod";
import { createTOPSchema } from "./index.js";

const bloom = createTOPSchema({
	pageindex: z.number().optional(),
	threshold: z.number().optional(),
	gain: z.number().optional(),
	size: z.number().optional(),
	outputsource: z.boolean().optional(),
	type: z.string().optional(),
	extend: z.string().optional(),
	iterations: z.number().optional(),
	gamma: z.number().optional(),
	srcblend: z.string().optional(),
	destblend: z.string().optional(),
});

export { bloom };

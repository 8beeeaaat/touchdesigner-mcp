import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const convolve = createTOPSchema({
	pageindex: z.number().optional(),
	dat: z.any().optional(),
	normalize: z.boolean().optional(),
	applytoalpha: z.boolean().optional(),
	offset: z.number().optional(),
	scale: z.number().optional(),
});

export { convolve };

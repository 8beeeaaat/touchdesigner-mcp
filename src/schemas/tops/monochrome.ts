import { z } from "zod";
import { createTOPSchema } from "./index.js";

const monochrome = createTOPSchema({
	pageindex: z.number().optional(),
	algorithm: z.string().optional(),
	weightr: z.number().optional(),
	weightg: z.number().optional(),
	weightb: z.number().optional(),
	mono: z.boolean().optional(),
	outputresolution: z.string().optional(),
});

export { monochrome };

import { z } from "zod";
import { createTOPSchema } from "./index.js";

const threshold = createTOPSchema({
	pageindex: z.number().optional(),
	comparator: z.string().optional(),
	rgb: z.string().optional(),
	threshold: z.number().optional(),
	alpha: z.string().optional(),
	soften: z.number().optional(),
});

export { threshold };

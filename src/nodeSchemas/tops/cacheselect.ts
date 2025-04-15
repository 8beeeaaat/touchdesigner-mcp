import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const cacheselect = createTOPSchema({
	pageindex: z.number().optional(),
	cachetop: z.any().optional(),
	index: z.number().optional(),
});

export { cacheselect };

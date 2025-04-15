import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const resolution = createTOPSchema({
	pageindex: z.number().optional(),
	highqualresize: z.boolean().optional(),
});

export { resolution };

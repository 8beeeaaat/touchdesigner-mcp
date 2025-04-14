import { z } from "zod";
import { createTOPSchema } from "./index.js";

const resolution = createTOPSchema({
	pageindex: z.number().optional(),
	highqualresize: z.boolean().optional(),
});

export { resolution };

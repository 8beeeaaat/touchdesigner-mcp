import { z } from "zod";
import { createTOPSchema } from "./index.js";

const out = createTOPSchema({
	pageindex: z.number().optional(),
	name: z.string().optional(),
	connectorder: z.number().optional(),
});

export { out };

import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const script = createTOPSchema({
	pageindex: z.number().optional(),
	callbacks: z.string().optional(),
	setuppars: z.boolean().optional(),
});

export { script };

import { z } from "zod";
import { createTOPSchema } from "./index.js";

const inNode = createTOPSchema({
	pageindex: z.number().optional(),
	label: z.string().optional(),
	connectorder: z.number().optional(),
});

export { inNode };

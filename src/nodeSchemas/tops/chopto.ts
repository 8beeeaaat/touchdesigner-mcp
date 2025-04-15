import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const chopto = createTOPSchema({
	pageindex: z.number().optional(),
	chop: z.any().optional(),
	dataformat: z.string().optional(),
	clamp: z.boolean().optional(),
	layout: z.string().optional(),
	rgba1: z.number().optional(),
	rgba2: z.number().optional(),
	rgba3: z.number().optional(),
	rgba4: z.number().optional(),
});

export { chopto };

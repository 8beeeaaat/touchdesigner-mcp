import { z } from "zod";
import { createTOPSchema } from "./index.js";

const substance = createTOPSchema({
	pageindex: z.number().optional(),
	file: z.string().optional(),
	reloadconfig: z.boolean().optional(),
	graph: z.string().optional(),
	output: z.string().optional(),
	invertnormal: z.boolean().optional(),
	engine: z.string().optional(),
});

export { substance };

import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const importselect = createTOPSchema({
	pageindex: z.number().optional(),
	parent: z.any().optional(),
	texture: z.string().optional(),
	reload: z.boolean().optional(),
});

export { importselect };

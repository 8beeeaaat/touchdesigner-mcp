import { z } from "zod";
import { createTOPSchema } from "./index.js";

const renderstreamin = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	name: z.string().optional(),
});

export { renderstreamin };

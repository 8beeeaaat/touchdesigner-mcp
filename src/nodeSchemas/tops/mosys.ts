import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const mosys = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	type: z.string().optional(),
	connection: z.string().optional(),
	image: z.string().optional(),
});

export { mosys };

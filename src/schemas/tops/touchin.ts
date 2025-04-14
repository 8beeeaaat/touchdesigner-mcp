import { z } from "zod";
import { createTOPSchema } from "./index.js";

const touchin = createTOPSchema({
	pageindex: z.number().optional(),
	address: z.string().optional(),
	port: z.number().optional(),
	active: z.boolean().optional(),
	mintarget: z.number().optional(),
	maxtarget: z.number().optional(),
	maxqueue: z.number().optional(),
});

export { touchin };

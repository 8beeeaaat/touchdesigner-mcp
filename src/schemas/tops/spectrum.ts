import { z } from "zod";
import { createTOPSchema } from "./index.js";

const spectrum = createTOPSchema({
	pageindex: z.number().optional(),
	mode: z.string().optional(),
	coord: z.string().optional(),
	chan: z.string().optional(),
	transrows: z.boolean().optional(),
});

export { spectrum };

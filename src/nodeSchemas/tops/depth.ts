import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const depth = createTOPSchema({
	pageindex: z.number().optional(),
	nearrange: z.number().optional(),
	farrange: z.number().optional(),
	nearrangea: z.number().optional(),
	farrangea: z.number().optional(),
	contrastamount: z.number().optional(),
	contrastamounta: z.number().optional(),
	contrastcenter: z.number().optional(),
	contrastcentera: z.number().optional(),
	type: z.string().optional(),
	format: z.string().optional(),
	normalize: z.boolean().optional(),
	alpha: z.string().optional(),
});

export { depth };

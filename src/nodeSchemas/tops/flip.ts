import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const flip = createTOPSchema({
	pageindex: z.number().optional(),
	flipx: z.boolean().optional(),
	flipy: z.boolean().optional(),
	flop: z.string().optional(),
});

export { flip };

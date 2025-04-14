import { z } from "zod";
import { createTOPSchema } from "./index.js";

const rgbkey = createTOPSchema({
	pageindex: z.number().optional(),
	redr: z.number().optional(),
	redg: z.number().optional(),
	redb: z.number().optional(),
	reda: z.number().optional(),
	threshold: z.number().optional(),
	outchannel: z.string().optional(),
	invert: z.boolean().optional(),
});

export { rgbkey };

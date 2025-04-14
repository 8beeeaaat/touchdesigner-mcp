import { z } from "zod";
import { createTOPSchema } from "./index.js";

const feedback = createTOPSchema({
	pageindex: z.number().optional(),
	top: z.any().optional(),
	reset: z.boolean().optional(),
	resetpulse: z.boolean().optional(),
});

export { feedback };

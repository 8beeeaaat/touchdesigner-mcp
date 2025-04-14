import { z } from "zod";
import { createTOPSchema } from "./index.js";

const stype = createTOPSchema({
	pageindex: z.number().optional(),
	chop: z.any().optional(),
	padding: z.number().optional(),
});

export { stype };

import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const select = createTOPSchema({
	pageindex: z.number().optional(),
	top: z.any().optional(),
});

export { select };

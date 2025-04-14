import { z } from "zod";
import { createTOPSchema } from "./index.js";

const select = createTOPSchema({
	pageindex: z.number().optional(),
	top: z.any().optional(),
});

export { select };

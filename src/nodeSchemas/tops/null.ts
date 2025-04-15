import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const nullNode = createTOPSchema({
	pageindex: z.number().optional(),
});

export { nullNode };

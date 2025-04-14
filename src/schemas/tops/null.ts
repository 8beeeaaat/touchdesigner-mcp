import { z } from "zod";
import { createTOPSchema } from "./index.js";

const nullNode = createTOPSchema({
	pageindex: z.number().optional(),
});

export { nullNode };

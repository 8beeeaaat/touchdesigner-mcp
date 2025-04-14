import { z } from "zod";
import { createTOPSchema } from "./index.js";

const substanceselect = createTOPSchema({
	pageindex: z.number().optional(),
	substance: z.any().optional(),
	output: z.string().optional(),
});

export { substanceselect };

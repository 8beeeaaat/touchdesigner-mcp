import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const rgbtohsv = createTOPSchema({
	pageindex: z.number().optional(),
});

export { rgbtohsv };

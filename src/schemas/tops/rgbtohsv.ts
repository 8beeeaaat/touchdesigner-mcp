import { z } from "zod";
import { createTOPSchema } from "./index.js";

const rgbtohsv = createTOPSchema({
	pageindex: z.number().optional(),
});

export { rgbtohsv };

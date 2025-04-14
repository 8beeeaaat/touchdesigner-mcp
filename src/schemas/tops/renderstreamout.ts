import { z } from "zod";
import { createTOPSchema } from "./index.js";

const renderstreamout = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	streamindex: z.number().optional(),
	profilechop: z.any().optional(),
});

export { renderstreamout };

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const switchNode = createCHOPSchema({
	indexfirst: z.boolean().optional().describe("Index First"),
	index: z.number().optional().describe("Index"),
});

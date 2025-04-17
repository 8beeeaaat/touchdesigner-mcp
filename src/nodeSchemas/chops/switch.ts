import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const switch_ = createCHOPSchema({
	indexfirst: z.boolean().optional().describe("Index First"),
	index: z.number().optional().describe("Index"),
});

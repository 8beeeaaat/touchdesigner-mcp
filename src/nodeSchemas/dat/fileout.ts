import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const fileout = createDATSchema({
	file: z.string().optional().describe("File"),
	n: z.number().optional().describe("N"),
	write: z.boolean().optional().describe("Write"),
	append: z.boolean().optional().describe("Append"),
});

import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const insert = createDATSchema({
	insert: z.string().optional().describe("Insert"),
	at: z.string().optional().describe("At"),
	index: z.number().optional().describe("Index"),
	contents: z.string().optional().describe("Contents"),
	includenames: z.boolean().optional().describe("Include Names"),
	replaceduplicate: z.boolean().optional().describe("Replace Duplicate"),
	replace: z.number().optional().describe("Replace"),
	replace0names: z.string().optional().describe("Replace Names"),
	replace0expr: z.string().optional().describe("Replace Expression"),
});

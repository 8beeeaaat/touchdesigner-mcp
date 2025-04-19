import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const sort = createDATSchema({
	sortmethod: z.string().optional().describe("Sort Method"),
	name: z.string().optional().describe("Name"),
	index: z.number().optional().describe("Index"),
	order: z.string().optional().describe("Order"),
	seed: z.number().optional().describe("Seed"),
	ignorecase: z.boolean().optional().describe("Ignore Case"),
	preservefirst: z.boolean().optional().describe("Preserve First"),
	unique: z.string().optional().describe("Unique"),
	reverse: z.boolean().optional().describe("Reverse"),
});

import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const reorder = createDATSchema({
	reorder: z.string().optional().describe("Reorder"),
	method: z.string().optional().describe("Method"),
	before: z.string().optional().describe("Before"),
	after: z.string().optional().describe("After"),
	order: z.string().optional().describe("Order"),
	delete: z.boolean().optional().describe("Delete"),
});

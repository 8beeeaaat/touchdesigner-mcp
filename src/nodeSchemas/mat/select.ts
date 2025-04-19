import { z } from "zod";
import { createMATSchema } from "./utils.js";

const select = createMATSchema({
	index: z.number().optional().describe("Index"),
	reloadonchange: z.boolean().optional().describe("Reload on Change"),
	selectmat: z.any().nullable().optional().describe("Select Material"),
});

export { select };

import { z } from "zod";
import { createMATSchema } from "./utils.js";

const switchNode = createMATSchema({
	index: z.number().optional().describe("Index"),
	reloadonchange: z.boolean().optional().describe("Reload on Change"),
});

export { switchNode };

import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const switchNode = createDATSchema({
	index: z.number().optional().describe("Index"),
});

import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const info = createDATSchema({
	op: z.any().optional().describe("Op"),
	passive: z.boolean().optional().describe("Passive"),
});

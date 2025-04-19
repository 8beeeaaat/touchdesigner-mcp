import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const convert = createDATSchema({
	how: z.string().optional().describe("How"),
	removeblank: z.boolean().optional().describe("Remove Blank"),
	delimiters: z.string().optional().describe("Delimiters"),
	spacers: z.string().optional().describe("Spacers"),
});

import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const merge = createDATSchema({
	dats: z.any().optional().describe("DATs"),
	how: z.string().optional().describe("How"),
	byname: z.boolean().optional().describe("By Name"),
	spacer: z.string().optional().describe("Spacer"),
	unmatched: z.boolean().optional().describe("Unmatched"),
});

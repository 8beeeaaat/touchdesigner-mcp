import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const inNode = createDATSchema({
	label: z.string().optional().describe("Label"),
	connectorder: z.number().optional().describe("Connect Order"),
});

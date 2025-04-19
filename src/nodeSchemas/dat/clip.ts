import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const clip = createDATSchema({
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	reload: z.boolean().optional().describe("Reload"),
	executeloc: z.string().optional().describe("Execute Location"),
	clip: z.any().optional().describe("Clip"),
	component: z.string().optional().describe("Component"),
	framefirst: z.number().optional().describe("Frame First"),
	frameloop: z.number().optional().describe("Frame Loop"),
	exit: z.boolean().optional().describe("Exit"),
	printstate: z.boolean().optional().describe("Print State"),
});

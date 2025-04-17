import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const parameter = createCHOPSchema({
	ops: z.string().optional().describe("Operators"),
	pargroups: z.string().optional().describe("Parameter Groups"),
	parameters: z.string().optional().describe("Parameters"),
	nameformat: z.string().optional().describe("Name Format"),
	sortmethod: z.string().optional().describe("Sort Method"),
	renamefrom: z.string().optional().describe("Rename From"),
	renameto: z.string().optional().describe("Rename To"),
	custom: z.boolean().optional().describe("Custom"),
	builtin: z.boolean().optional().describe("Built-in"),
});

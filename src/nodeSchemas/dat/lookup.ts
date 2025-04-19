import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const lookup = createDATSchema({
	index: z.string().optional().describe("Index"),
	valuelocation: z.string().optional().describe("Value Location"),
	valuename: z.string().optional().describe("Value Name"),
	valueindex: z.number().optional().describe("Value Index"),
	includeheader: z.boolean().optional().describe("Include Header"),
});

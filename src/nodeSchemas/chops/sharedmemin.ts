import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const sharedmemin = createCHOPSchema({
	name: z.string().optional().describe("Memory Name"),
	memtype: z.string().optional().describe("Memory Type"),
});

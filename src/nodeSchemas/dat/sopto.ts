import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const sopto = createDATSchema({
	sop: z.any().optional().describe("SOP"),
	extract: z.string().optional().describe("Extract"),
	group: z.string().optional().describe("Group"),
	attrib: z.string().optional().describe("Attribute"),
	uvforpts: z.boolean().optional().describe("UV for Points"),
});

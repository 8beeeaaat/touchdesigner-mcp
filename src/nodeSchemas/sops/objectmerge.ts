import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const objectmerge = createSOPSchema({
	xform: z.union([z.string(), z.null()]).optional().describe("Transform"),
	merge: z.number().optional().describe("Merge"),
	merge0sop: z.union([z.string(), z.null()]).optional().describe("Merge 0 SOP"),
});

export { objectmerge };

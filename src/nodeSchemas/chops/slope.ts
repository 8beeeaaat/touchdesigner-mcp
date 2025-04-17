import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const slope = createCHOPSchema({
	type: z.string().optional().describe("Type"),
	method: z.string().optional().describe("Method"),
	slopesamples: z.boolean().optional().describe("Slope Samples"),
});

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const hold = createCHOPSchema({
	sample: z.string().optional().describe("Sample"),
	hold: z.boolean().optional().describe("Hold"),
	holdpulse: z.boolean().optional().describe("Hold Pulse"),
	holdsamples: z.boolean().optional().describe("Hold Samples"),
});

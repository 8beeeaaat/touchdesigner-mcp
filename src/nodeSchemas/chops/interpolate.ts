import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const interpolate = createCHOPSchema({
	blendfunc: z.string().optional().describe("Blend Function"),
	overlap: z.string().optional().describe("Overlap"),
	match: z.string().optional().describe("Match"),
});

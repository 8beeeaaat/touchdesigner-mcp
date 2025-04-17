import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const phaser = createCHOPSchema({
	edge: z.number().optional().describe("Edge"),
	nsamples: z.number().optional().describe("Number of Samples"),
	outputformat: z.string().optional().describe("Output Format"),
});

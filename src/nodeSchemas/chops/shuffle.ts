import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const shuffle = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	nval: z.number().optional().describe("N Value"),
	firstsample: z.boolean().optional().describe("First Sample"),
});

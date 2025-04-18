import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const reorder = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	orderref: z.string().optional().describe("Order Reference"),
	numpattern: z.string().optional().describe("Number Pattern"),
	charpattern: z.string().optional().describe("Character Pattern"),
	seed: z.number().optional().describe("Seed"),
	nvalue: z.number().optional().describe("N Value"),
	rempos: z.string().optional().describe("Remainder Position"),
	remorder: z.string().optional().describe("Remainder Order"),
});

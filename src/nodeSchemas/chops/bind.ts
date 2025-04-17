import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for bind CHOP node parameters
 */
export const bind = createCHOPSchema({
	match: z.string().optional().describe("Match"),
	pickup: z.boolean().optional().describe("Pickup"),
	exhold: z.number().optional().describe("Export Hold"),
	exholdunit: z.string().optional().describe("Export Hold Unit"),
	callbacks: z.string().optional().describe("Callbacks"),
});

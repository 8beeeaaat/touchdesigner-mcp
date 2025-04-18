import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for attribute CHOP node parameters
 */
export const attribute = createCHOPSchema({
	slerp: z.string().optional().describe("Slerp"),
	rord: z.string().optional().describe("Rotation Order"),
});

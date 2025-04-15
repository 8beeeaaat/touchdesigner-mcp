import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for time COMP node parameters
 */
export const time = createCOMPSchema({
	play: z.number().optional(),
	rate: z.number().optional(),
	start: z.number().optional(),
	end: z.number().optional(),

	rangelimit: z.string().optional(),
	rangestart: z.number().optional(),
	rangeend: z.number().optional(),
	resetframe: z.number().optional(),

	signature1: z.number().optional(),
	signature2: z.number().optional(),
	tempo: z.number().optional(),

	independent: z.boolean().optional(),
});

import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiobandeq CHOP node parameters
 */
export const audiobandeq = createCHOPSchema({
	drywet: z.number().optional().describe("Dry/Wet"),
	band1: z.number().optional().describe("Band 1"),
	band2: z.number().optional().describe("Band 2"),
	band3: z.number().optional().describe("Band 3"),
	band4: z.number().optional().describe("Band 4"),
	band5: z.number().optional().describe("Band 5"),
	band6: z.number().optional().describe("Band 6"),
	band7: z.number().optional().describe("Band 7"),
	band8: z.number().optional().describe("Band 8"),
	band9: z.number().optional().describe("Band 9"),
	band10: z.number().optional().describe("Band 10"),
	band11: z.number().optional().describe("Band 11"),
	band12: z.number().optional().describe("Band 12"),
	band13: z.number().optional().describe("Band 13"),
	band14: z.number().optional().describe("Band 14"),
	band15: z.number().optional().describe("Band 15"),
	band16: z.number().optional().describe("Band 16"),
});

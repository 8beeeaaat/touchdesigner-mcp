import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiondi CHOP node parameters
 */
export const audiondi = createCHOPSchema({
	play: z.boolean().optional().describe("Play"),
	ndiintop: z.any().optional().describe("NDI In TOP"),
});

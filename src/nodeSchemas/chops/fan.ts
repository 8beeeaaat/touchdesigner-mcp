import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const fan = createCHOPSchema({
	fanop: z.string().optional().describe("Fan Operation"),
	channame: z.string().optional().describe("Channel Name"),
	range: z.string().optional().describe("Range"),
	alloff: z.string().optional().describe("All Off"),
	quantize: z.boolean().optional().describe("Quantize"),
});

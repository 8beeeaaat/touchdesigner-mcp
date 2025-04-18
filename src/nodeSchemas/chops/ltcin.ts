import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const ltcin = createCHOPSchema({
	inputrate: z.number().optional().describe("Input Rate"),
	discrete: z.boolean().optional().describe("Discrete"),
	totalframes: z.boolean().optional().describe("Total Frames"),
	totalsec: z.boolean().optional().describe("Total Seconds"),
	upsample: z.boolean().optional().describe("Upsample"),
	userfields: z.boolean().optional().describe("User Fields"),
	debugchans: z.boolean().optional().describe("Debug Channels"),
});
